variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region to deploy resources"
  type        = string
  default     = "europe-west1"
}

variable "db_password" {
  description = "PostgreSQL password for the planner user"
  type        = string
  sensitive   = true
}

variable "cors_allowed_origins" {
  description = "Frontend URL allowed for CORS (e.g. Vercel deployment URL)"
  type        = string
  default     = "*"
}
