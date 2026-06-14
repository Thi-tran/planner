resource "google_service_account" "cloudrun_sa" {
  account_id   = "planner-cloudrun-sa"
  display_name = "Planner Cloud Run Service Account"
}

resource "google_project_iam_member" "cloudrun_sa_sql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.cloudrun_sa.email}"
}

resource "google_project_iam_member" "cloudrun_sa_secret" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.cloudrun_sa.email}"
}
