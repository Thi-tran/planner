resource "google_artifact_registry_repository" "backend" {
  repository_id = "planner-backend"
  format        = "DOCKER"
  location      = var.region
  description   = "Docker images for the planner backend"

  depends_on = [google_project_service.artifactregistry]
}
