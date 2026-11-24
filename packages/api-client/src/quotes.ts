import { decodePolyline6, type LonLat, type RouteResult } from "@teko/maps";
import type { RideRow, TableRow, VehicleCategory } from "@teko/types";
import type { TekoClient } from "./client";
import { TekoApiError, unwrap } from "./errors";

export type RideQuote = TableRow<"ride_quotes">;

export async function getRideQuote(
  client: TekoClient,
  input: {
    category: VehicleCategory;
    origin: LonLat;
    destination: LonLat;
  },
): Promise<RideQuote> {
  const result = await client.functions.invoke<RideQuote>("price-quote", { body: input });
  const response = result.response;
  if (result.error && response?.status === 422) {
    const body = await response.json().catch(() => null);
    const code =
      body?.code === "POINTS_TOO_CLOSE"
        ? "quote_points_too_close"
        : body?.code === "ROUTE_NOT_FOUND"
          ? "quote_route_not_found"
          : body?.code === "OUTSIDE_SERVICE_AREA"
            ? "quote_outside_service_area"
            : null;
    if (code) throw new TekoApiError(code, body.code, { requestId: body.request_id });
  }
  return unwrap(result);
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
