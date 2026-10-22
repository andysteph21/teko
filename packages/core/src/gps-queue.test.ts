import { expect, it, vi } from "vitest";
import { drainGpsQueue, GPS_QUEUE_TTL_MS, type QueuedGpsPoint } from "./gps-queue";

const NOW = 1000000000;
const point = (id: string, extra = {}): QueuedGpsPoint => ({
  id,
  userId: "driver",
  rideId: "ride",
  lon: 9.45,
  lat: 0.4,
  recordedAt: NOW - 1000,
  ...extra,
});
function storage(points: QueuedGpsPoint[]) {
  return {
    purge: vi.fn().mockResolvedValue(undefined),
    read: vi.fn().mockResolvedValue(points),
    remove: vi.fn().mockResolvedValue(undefined),
  };
}
it("supprime les points expirés ou d'un autre compte sans les transmettre", async () => {
  const store = storage([
    point("old", { recordedAt: NOW - GPS_QUEUE_TTL_MS }),
    point("other", { userId: "another" }),
    point("valid"),
  ]);
  const send = vi.fn().mockResolvedValue(undefined);
  await drainGpsQueue({ userId: "driver", storage: store, send, now: NOW });
  expect(store.purge).toHaveBeenCalledWith("driver", NOW - GPS_QUEUE_TTL_MS);
  expect(send).toHaveBeenCalledTimes(1);
  expect(send).toHaveBeenCalledWith(point("valid"));
  expect(store.remove.mock.calls.flat()).toEqual(["old", "other", "valid"]);
});
it("une panne garde le point et la suite ; une prochaine exécution reprend les mêmes identifiants", async () => {
  const store = storage([point("a"), point("b")]);
  const send = vi.fn().mockRejectedValueOnce(new Error("réseau"));
  await drainGpsQueue({ userId: "driver", storage: store, send, now: NOW });
  expect(store.remove).not.toHaveBeenCalled();
  send.mockResolvedValue(undefined);
  await drainGpsQueue({ userId: "driver", storage: store, send, now: NOW });
  expect(send.mock.calls.map(([p]) => p.id)).toEqual(["a", "a", "b"]);
  expect(store.remove.mock.calls.flat()).toEqual(["a", "b"]);
});
it("un refus permanent élimine le point et laisse passer la suite", async () => {
  const store = storage([point("a"), point("b")]);
  const send = vi
    .fn()
    .mockRejectedValueOnce({ code: "not_authorized" })
    .mockResolvedValue(undefined);
  await drainGpsQueue({ userId: "driver", storage: store, send, now: NOW });
  expect(store.remove.mock.calls.flat()).toEqual(["a", "b"]);
});
