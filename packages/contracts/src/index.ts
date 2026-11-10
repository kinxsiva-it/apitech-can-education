/** Type-only API contracts. Never export database clients or server secrets here. */
export interface HealthResponse {
  status: 'ok'
  service: 'apitech-api'
}
