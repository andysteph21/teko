// Fabriques de lignes pour les tests du tableau de bord (aucun réseau).

import type { IncidentRow, RideRow } from "./activity";

export function makeRide(overrides: Partial<RideRow> = {}): RideRow {
  return {
    id: "ride-0001-aaaa-bbbb-cccc",
    status: "completed",
    category: "eco",
    client_id: "client-1",
    driver_id: "driver-1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    accepted_at: null,
    started_at: null,
    completed_at: new Date().toISOString(),
    scheduled_at: null,
    cancel_reason: null,
    origin_geom: null,
    dest_geom: null,
    origin_hint: null,
    dest_hint: null,
    origin_landmark_id: null,
    dest_landmark_id: null,
    meeting_landmark_id: null,
    distance_est_m: null,
    duration_est_s: null,
    payment_method: "airtel",
    pin_code: null,
    price_est: 1000,
    price_final: 1200,
    ...overrides,
  } as RideRow;
}

export function makeIncident(overrides: Partial<IncidentRow> = {}): IncidentRow {
  return {
    id: "incident-1",
    kind: "sos",
    status: "open",
    created_at: new Date().toISOString(),
    ride_id: "ride-0002-dddd-eeee-ffff",
    reporter: "client-1",
    assigned_to: null,
    message: null,
    resolution_note: null,
    resolved_at: null,
    ...overrides,
  };
}
