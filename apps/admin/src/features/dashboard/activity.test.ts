import { formatXaf } from "@teko/core";
import { describe, expect, it } from "vitest";
import {
  buildActivityFeed,
  formatEventTime,
  incidentEvent,
  rideEvent,
  shortRideId,
  sortIncidents,
  todayVolumeXaf,
} from "./activity";
import { makeIncident, makeRide } from "./fixtures";

describe("flux d'activité (A-02)", () => {
  it("course terminée : libellé, montant formaté, moyen de paiement, pastille OK", () => {
    const event = rideEvent(makeRide({ price_final: 1200, payment_method: "airtel" }));
    expect(event.label).toBe("Course terminée");
    expect(event.detail).toContain(formatXaf(1200));
    expect(event.detail).toContain("Airtel");
    expect(event.pill).toEqual({ text: "OK", tone: "ok" });
    expect(event.isSos).toBe(false);
  });

  it("montants PostgREST en strings : Number() appliqué avant formatage", () => {
    const ride = makeRide({ price_final: "3000" as unknown as number });
    expect(rideEvent(ride).detail).toContain(formatXaf(3000));
  });

  it("échec d'attribution : pastille Échec", () => {
    const event = rideEvent(makeRide({ status: "failed", completed_at: null }));
    expect(event.label).toBe("Échec d'attribution");
    expect(event.pill).toEqual({ text: "Échec", tone: "err" });
  });

  it("SOS ouvert : rouge, cliquable, course liée en identifiant court", () => {
    const event = incidentEvent(makeIncident({ ride_id: "abcd1234-0000" }));
    expect(event.label).toBe("SOS déclenché");
    expect(event.isSos).toBe(true);
    expect(event.pill.tone).toBe("err");
    expect(event.detail).toContain(shortRideId("abcd1234-0000"));
  });

  it("fusionne courses et incidents, du plus récent au plus ancien", () => {
    const feed = buildActivityFeed(
      [makeRide({ created_at: "2026-08-25T10:00:00Z" })],
      [
        makeIncident({ id: "i1", created_at: "2026-08-25T11:00:00Z" }),
        makeIncident({ id: "i2", kind: "report", created_at: "2026-08-25T09:00:00Z" }),
      ],
    );
    expect(feed.map((e) => e.id)).toEqual([
      "incident-i1",
      "ride-ride-0001-aaaa-bbbb-cccc",
      "incident-i2",
    ]);
  });

  it("volume du jour : seules les courses terminées aujourd'hui comptent", () => {
    const now = new Date("2026-08-25T15:00:00");
    const rides = [
      makeRide({ completed_at: "2026-08-25T08:00:00", price_final: 1200 }),
      makeRide({
        id: "r2",
        completed_at: "2026-08-25T12:00:00",
        price_final: null,
        price_est: 800,
      }),
      makeRide({ id: "r3", completed_at: "2026-08-24T12:00:00", price_final: 5000 }),
      makeRide({ id: "r4", status: "started", completed_at: null, price_est: 9000 }),
    ];
    expect(todayVolumeXaf(rides, now)).toEqual({ total: 2000, count: 2 });
  });

  it("heure seule le jour même, date + heure sinon", () => {
    const now = new Date("2026-08-25T15:00:00");
    expect(formatEventTime("2026-08-25T15:42:00", now)).toMatch(/^15[:h]42$/);
    expect(formatEventTime("2026-08-18T15:42:00", now)).toContain("18/08");
  });

  it("tri incidents : SOS non résolus en tête, résolus en queue", () => {
    const sorted = sortIncidents([
      makeIncident({ id: "resolu", status: "resolved", created_at: "2026-08-25T12:00:00Z" }),
      makeIncident({ id: "litige", kind: "dispute", created_at: "2026-08-25T11:00:00Z" }),
      makeIncident({ id: "sos", created_at: "2026-08-25T10:00:00Z" }),
    ]);
    expect(sorted.map((i) => i.id)).toEqual(["sos", "litige", "resolu"]);
  });
});
