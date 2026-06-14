resource "google_sql_database_instance" "main" {
  name             = "planner-postgres"
  database_version = "POSTGRES_16"
  region           = var.region

  deletion_protection = false

  settings {
    tier = "db-f1-micro"

    ip_configuration {
      ipv4_enabled    = false # No public IP — private VPC access only
      private_network = google_compute_network.vpc.id
    }

    backup_configuration {
      enabled = true
    }
  }

  depends_on = [
    google_project_service.sqladmin,
    google_service_networking_connection.private_vpc_connection,
  ]
}

resource "google_sql_database" "planner" {
  name     = "planner"
  instance = google_sql_database_instance.main.name
}

resource "google_sql_user" "planner" {
  name     = "planner"
  instance = google_sql_database_instance.main.name
  password = var.db_password
}

# Store DB password in Secret Manager — never stored as plain state value
resource "google_secret_manager_secret" "db_password" {
  secret_id = "planner-db-password"

  replication {
    auto {}
  }

  depends_on = [google_project_service.secretmanager]
}

resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = var.db_password
}
