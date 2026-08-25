import { describe, expect, it, vi } from "vitest";
import type { TekoClient } from "./client.js";
import { createRealtimePositionsChannel, type RidePositionEvent } from "./positions.js";

interface ChannelMock {
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  handler?: (payload: { new: Record<string, unknown> }) => void;
}

function realtimeClient(insertResult: { error: unknown } = { error: null }) {
  const channel: ChannelMock = {
    on: vi.fn((_event, _filter, handler) => {
      channel.handler = handler;
      return channel;
    }),
    subscribe: vi.fn(() => channel),
  };
  const insert = vi.fn().mockResolvedValue(insertResult);
  const client = {
    channel: vi.fn(() => channel),
    removeChannel: vi.fn().mockResolvedValue(undefined),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "driver-1" } } }) },
    from: vi.fn(() => ({ insert })),
  } as unknown as TekoClient;
  return { client, channel, insert };
}

describe("createRealtimePositionsChannel (ADR-13)", () => {
  it("subscribeRidePositions : filtre par course, parse la géométrie GeoJSON", async () => {
    const { client, channel } = realtimeClient();
    const positions = createRealtimePositionsChannel(client);
    const seen: RidePositionEvent[] = [];

    const unsubscribe = positions.subscribeRidePositions("ride-1", (e) => seen.push(e));
    expect(client.channel).toHaveBeenCalledWith("ride-positions-ride-1");
    expect(channel.on.mock.calls[0]?.[1]).toMatchObject({
      table: "ride_locations",
      filter: "ride_id=eq.ride-1",
    });

    channel.handler?.({
      new: {
        ride_id: "ride-1",
        geom: { type: "Point", coordinates: [9.4536, 0.4032] },
        recorded_at: "2026-08-25T10:00:00Z",
      },
    });
    expect(seen).toEqual([
      { rideId: "ride-1", lon: 9.4536, lat: 0.4032, recordedAt: "2026-08-25T10:00:00Z" },
    ]);

    await unsubscribe();
    expect(client.removeChannel).toHaveBeenCalledWith(channel);
  });

  it("subscribeRideStatus : relaie le statut mis à jour", () => {
    const { client, channel } = realtimeClient();
    const positions = createRealtimePositionsChannel(client);
    const statuses: string[] = [];

    positions.subscribeRideStatus("ride-1", (s) => statuses.push(s));
    expect(channel.on.mock.calls[0]?.[1]).toMatchObject({ table: "rides", filter: "id=eq.ride-1" });
    channel.handler?.({ new: { status: "arrived" } });
    expect(statuses).toEqual(["arrived"]);
  });

  it("pushRidePosition : arrondi éco (~11 m) et écriture chauffeur", async () => {
    const { client, insert } = realtimeClient();
    const positions = createRealtimePositionsChannel(client, { eco: true });

    await positions.pushRidePosition("ride-1", { lon: 9.4536789, lat: 0.4032111 });
    expect(insert).toHaveBeenCalledWith({
      ride_id: "ride-1",
      driver_id: "driver-1",
      geom: "SRID=4326;POINT(9.4537 0.4032)",
    });
  });

  it("pushRidePosition : l'erreur d'insertion devient TekoApiError", async () => {
    const { client } = realtimeClient({ error: { message: "permission denied", code: "42501" } });
    const positions = createRealtimePositionsChannel(client);
    await expect(
      positions.pushRidePosition("ride-1", { lon: 9.45, lat: 0.4 }),
    ).rejects.toMatchObject({ code: "not_authorized" });
  });
});
