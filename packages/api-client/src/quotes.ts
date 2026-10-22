import { decodePolyline6, type LonLat, type RouteResult } from "@teko/maps";
import type { RideRow, TableRow, VehicleCategory } from "@teko/types";
import type { TekoClient } from "./client";
import { unwrap } from "./errors";

export type RideQuote = TableRow<"ride_quotes">;

export async function getRideQuote(
  client: TekoClient,
  input: {
    category: VehicleCategory;
    origin: LonLat;
    destination: LonLat;
  },
): Promise<RideQuote> {
  return unwrap(await client.functions.invoke<RideQuote>("price-quote", { body: input }));
}

export function quoteRoute(quote: RideQuote): RouteResult {
  return {
    coordinates: decodePolyline6(quote.route_shape),
    distanceM: quote.distance_m,
    durationS: quote.duration_s,
  };
}

export async function requestQuotedRide(
  client: TekoClient,
  input: {
    quoteId: string;
    originHint?: string;
    destinationHint?: string;
    originLandmarkId?: string;
    destinationLandmarkId?: string;
    meetingLandmarkId?: string;
  },
): Promise<RideRow> {
  const common = {
    p_quote: input.quoteId,
    ...(input.originHint ? { p_origin_hint: input.originHint } : {}),
    ...(input.destinationHint ? { p_dest_hint: input.destinationHint } : {}),
    ...(input.destinationLandmarkId ? { p_dest_landmark: input.destinationLandmarkId } : {}),
  };
  if (input.meetingLandmarkId) {
    return unwrap(
      await client.rpc("request_quoted_pickup", {
        ...common,
        p_meeting_landmark: input.meetingLandmarkId,
      }),
    );
  }
  return unwrap(
    await client.rpc("request_quoted_ride", {
      ...common,
      ...(input.originLandmarkId ? { p_origin_landmark: input.originLandmarkId } : {}),
    }),
  );
}
