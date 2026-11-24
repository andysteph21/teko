// Règles pures des lots R3 à R5 : arrêts et attente, demande de modification
// en attente, passagers d'un covoiturage, nature d'une course.

import type { RideStop, RouteChange } from "@teko/api-client";
import type { RideRow } from "@teko/types";

const mockListMyRides = jest.fn();
jest.mock("@teko/api-client", () => ({
  listMyRides: (...args: unknown[]) => mockListMyRides(...args),
}));
jest.mock("../../lib/supabase", () => ({ supabase: {} }));

import {
  dialableRecipientPhone,
  isActiveStatus,
  isClassic,
  isDelivery,
  isShared,
} from "./ride-kind";
import { changeStopsCount, isPendingChange, sameChange } from "./route-change";
import { leaveRide, passengerAction, seatsTaken, tripPassengers } from "./shared-rides";
import {
  billedMinutes,
  currentStop,
  mmss,
  nextStop,
  replaceStop,
  stopPhase,
  waitSeconds,
} from "./stops";

const stop = (seq: number, patch: Partial<RideStop> = {}): RideStop => ({
  id: `s${seq}`,
  seq,
  position: { lon: 9.46, lat: 0.41 },
  landmarkId: null,
  hint: null,
  arrivedAt: null,
  leftAt: null,
  waitCharged: 0,
  ...patch,
});

describe("arrêts (lot R3)", () => {
  it("ordre imposé : le prochain arrêt est le premier non atteint, aucun pendant un arrêt", () => {
    const todo = [stop(1), stop(2)];
    expect(currentStop(todo)).toBeNull();
    expect(nextStop(todo)?.id).toBe("s1");

    const waiting = [stop(1, { arrivedAt: "2026-11-23T10:00:00Z" }), stop(2)];
    expect(stopPhase(waiting[0] as RideStop)).toBe("waiting");
    expect(currentStop(waiting)?.id).toBe("s1");
    expect(nextStop(waiting)).toBeNull();

    const left = replaceStop(
      waiting,
      stop(1, { arrivedAt: "2026-11-23T10:00:00Z", leftAt: "2026-11-23T10:02:00Z" }),
    );
    expect(stopPhase(left[0] as RideStop)).toBe("done");
    expect(currentStop(left)).toBeNull();
    expect(nextStop(left)?.id).toBe("s2");
    expect(nextStop([stop(1, { arrivedAt: "a", leftAt: "b" })])).toBeNull();
  });

  it("attente : trois minutes gratuites, puis chaque minute entamée est facturée", () => {
    const now = Date.parse("2026-11-23T10:05:10Z");
    expect(waitSeconds("2026-11-23T10:00:00Z", now)).toBe(310);
    expect(waitSeconds("2026-11-23T10:06:00Z", now)).toBe(0);
    expect(billedMinutes(0)).toBe(0);
    expect(billedMinutes(180)).toBe(0);
    expect(billedMinutes(181)).toBe(1);
    // 5 min 10 s : six minutes entamées, trois gratuites (scénario serveur).
    expect(billedMinutes(310)).toBe(3);
    expect(mmss(310)).toBe("5:10");
    expect(mmss(-4)).toBe("0:00");
  });
});

describe("demande de modification (lot R3)", () => {
  const change = (patch: object) => ({ id: "c1", status: "pending", ...patch }) as RouteChange;
  const now = Date.parse("2026-11-23T10:00:00Z");

  it("en attente seulement avant l'échéance serveur", () => {
    expect(isPendingChange(change({ respond_by: "2026-11-23T10:00:30Z" }), now)).toBe(true);
    expect(isPendingChange(change({ respond_by: "2026-11-23T09:59:59Z" }), now)).toBe(false);
    expect(isPendingChange(change({ respond_by: null }), now)).toBe(false);
    expect(
      isPendingChange(change({ status: "accepted", respond_by: "2026-11-23T10:00:30Z" }), now),
    ).toBe(false);
    expect(isPendingChange(null, now)).toBe(false);
  });

  it("compte les arrêts demandés et reconnaît une ligne inchangée", () => {
    expect(changeStopsCount(change({ stops: [{}, {}] }))).toBe(2);
    expect(changeStopsCount(change({ stops: null }))).toBe(0);
    expect(sameChange(change({}), change({}))).toBe(true);
    expect(sameChange(change({}), change({ status: "refused" }))).toBe(false);
    expect(sameChange(null, null)).toBe(true);
    expect(sameChange(null, change({}))).toBe(false);
  });
});

const ride = (patch: object): RideRow =>
  ({
    id: "r1",
    status: "started",
    category: "covoiturage",
    service_type: "ride",
    shared_trip_id: "t1",
    seats: 1,
    origin_hint: null,
    price_est: "775",
    price_final: null,
    created_at: "2026-11-23T10:00:00Z",
    accepted_at: "2026-11-23T10:01:00Z",
    ...patch,
  }) as unknown as RideRow;

describe("covoiturage (lot R4)", () => {
  it("nature d'une course", () => {
    expect(isShared(ride({}))).toBe(true);
    expect(isDelivery(ride({ service_type: "delivery" }))).toBe(true);
    expect(isClassic(ride({ category: "eco" }))).toBe(true);
    expect(isClassic(ride({}))).toBe(false);
    expect(isClassic(ride({ category: "moto", service_type: "delivery" }))).toBe(false);
    expect(isClassic(null)).toBe(false);
    expect(isActiveStatus("arrived")).toBe(true);
    expect(isActiveStatus("completed")).toBe(false);
    expect(isActiveStatus("requested")).toBe(false);
    expect(isActiveStatus(null)).toBe(false);
  });

  it("passagers du même trajet seulement, rang stable, courses closes masquées", () => {
    const current = ride({ id: "r2", seats: 2, accepted_at: "2026-11-23T10:05:00Z" });
    const passengers = tripPassengers(
      [
        ride({ id: "r3", status: "accepted", accepted_at: "2026-11-23T10:09:00Z" }),
        ride({ id: "r2", status: "arrived", accepted_at: "2026-11-23T10:05:00Z" }),
        ride({ id: "r1", status: "completed" }),
        ride({ id: "x", shared_trip_id: "autre" }),
        ride({ id: "y", shared_trip_id: null, category: "eco" }),
      ],
      current,
    );
    expect(passengers.map((p) => [p.rideId, p.number, p.current])).toEqual([
      ["r2", 2, true],
      ["r3", 3, false],
    ]);
    // La course affichée garde l'état de l'écran, pas celui de la liste lue.
    expect(passengers[0]?.status).toBe("started");
    expect(passengers[0]?.amount).toBe(775);
    expect(seatsTaken(passengers)).toBe(3);
  });

  it("course absente de la liste lue ou sans trajet : elle seule", () => {
    expect(tripPassengers([], ride({ id: "r9" })).map((p) => p.rideId)).toEqual(["r9"]);
    const alone = tripPassengers(
      [ride({ id: "z", shared_trip_id: null })],
      ride({ shared_trip_id: null }),
    );
    expect(alone).toHaveLength(1);
  });

  it("action suivante par passager", () => {
    expect(passengerAction("accepted")).toBe("aPrendre");
    expect(passengerAction("enroute")).toBe("aPrendre");
    expect(passengerAction("arrived")).toBe("code");
    expect(passengerAction("started")).toBe("aDeposer");
  });

  it("sortie : passager suivant relu sous JWT, accueil sinon ou en cas de panne", async () => {
    const go = jest.fn();
    leaveRide(ride({ category: "eco", shared_trip_id: null }), go);
    expect(go).toHaveBeenCalledWith("/(main)/home");
    expect(mockListMyRides).not.toHaveBeenCalled();
    leaveRide(null, go);
    expect(go).toHaveBeenCalledTimes(2);

    go.mockClear();
    const done = ride({ id: "r1", status: "completed" });
    mockListMyRides.mockResolvedValueOnce([done, ride({ id: "r2", status: "accepted" })]);
    leaveRide(done, go);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(go).toHaveBeenCalledWith("/(main)/ride/r2");

    go.mockClear();
    mockListMyRides.mockRejectedValueOnce(new Error("réseau"));
    leaveRide(done, go);
    await new Promise<void>((resolve) => setImmediate(() => resolve()));
    expect(go).toHaveBeenCalledWith("/(main)/home");
  });
});

describe("numéro du destinataire (lot R5)", () => {
  it("garde un numéro local tel que saisi, sans « + »", () => {
    expect(dialableRecipientPhone("074000009")).toBe("074000009");
  });
  it("préfixe un numéro portant l'indicatif gabonais", () => {
    expect(dialableRecipientPhone("24174000009")).toBe("+24174000009");
  });
  it("rend null quand le numéro est effacé ou absent", () => {
    expect(dialableRecipientPhone("")).toBeNull();
    expect(dialableRecipientPhone(null)).toBeNull();
  });
});
