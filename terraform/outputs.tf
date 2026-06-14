output "sql_instance_connection_name" {
  description = "Cloud SQL instance connection name (used in SPRING_DATASOURCE_URL)"
  value       = google_sql_database_instance.main.connection_name
}

output "artifact_registry_url" {
  description = "Artifact Registry Docker repository URL"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.backend.repository_id}"
}

output "cloud_run_url" {
  description = "Cloud Run service URL"
  value       = google_cloud_run_v2_service.backend.uri
}
