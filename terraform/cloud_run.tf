locals {
  image_url      = "${var.region}-docker.pkg.dev/${var.project_id}/planner-backend/backend:latest"
  datasource_url = "jdbc:postgresql:///planner?cloudSqlInstance=${google_sql_database_instance.main.connection_name}&socketFactory=com.google.cloud.sql.postgres.SocketFactory&ipTypes=PRIVATE"
}

resource "google_cloud_run_v2_service" "backend" {
  name     = "planner-backend"
  location = var.region

  template {
    service_account = google_service_account.cloudrun_sa.email

    # Route outbound traffic through the VPC so Cloud Run can reach Cloud SQL's private IP
    vpc_access {
      network_interfaces {
        network    = google_compute_network.vpc.id
        subnetwork = google_compute_subnetwork.subnet.id
      }
      egress = "PRIVATE_RANGES_ONLY"
    }

    # Injects the Cloud SQL Auth Proxy sidecar; uses private IP via VPC
    annotations = {
      "run.googleapis.com/cloudsql-instances" = google_sql_database_instance.main.connection_name
    }

    scaling {
      min_instance_count = 1
      max_instance_count = 10
    }

    containers {
      image = local.image_url

      resources {
        limits = {
          cpu    = "1000m"
          memory = "512Mi"
        }
      }

      env {
        name  = "DB_NAME"
        value = "planner"
      }

      env {
        name  = "DB_USER"
        value = "planner"
      }

      # DB_PASSWORD sourced from Secret Manager — never in plaintext env
      env {
        name = "DB_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_password.secret_id
            version = "latest"
          }
        }
      }

      # Overrides DB_HOST/DB_PORT; uses Cloud SQL socket factory
      env {
        name  = "SPRING_DATASOURCE_URL"
        value = local.datasource_url
      }

      env {
        name  = "CORS_ALLOWED_ORIGINS"
        value = var.cors_allowed_origins
      }

      startup_probe {
        http_get {
          path = "/actuator/health"
        }
        initial_delay_seconds = 10
        period_seconds        = 10
        failure_threshold     = 60
      }

      liveness_probe {
        http_get {
          path = "/actuator/health"
        }
        initial_delay_seconds = 10
        period_seconds        = 15
        failure_threshold     = 3
      }
    }
  }

  depends_on = [
    google_project_service.run,
    google_project_iam_member.cloudrun_sa_sql,
    google_project_iam_member.cloudrun_sa_secret,
  ]

  # Image updates are managed by deploy.sh (tagged by git SHA).
  # Terraform only manages infrastructure config, not the running image.
  lifecycle {
    ignore_changes = [template[0].containers[0].image]
  }
}

# Allow unauthenticated (public) access to the Cloud Run service
resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  project  = google_cloud_run_v2_service.backend.project
  location = google_cloud_run_v2_service.backend.location
  name     = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
