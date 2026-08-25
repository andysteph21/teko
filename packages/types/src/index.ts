// Point d'entrée de @teko/types — types générés + raccourcis d'usage.
// `database.ts` est GÉNÉRÉ (pnpm gen:types à la racine) : ne jamais l'éditer.

import type { Database } from "./database";

export type { Database, Json } from "./database";

type PublicSchema = Database["public"];

/** Ligne d'une table du schéma public : `TableRow<"rides">`. */
export type TableRow<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];

/** Payload d'insertion d'une table : `TableInsert<"saved_places">`. */
export type TableInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];

/** Énumération du schéma public : `DbEnum<"ride_status">`. */
export type DbEnum<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];

/** Arguments et retour d'une fonction RPC : `RpcArgs<"request_ride">`. */
export type RpcArgs<T extends keyof PublicSchema["Functions"]> =
  PublicSchema["Functions"][T]["Args"];
export type RpcReturns<T extends keyof PublicSchema["Functions"]> =
  PublicSchema["Functions"][T]["Returns"];

// Raccourcis métier les plus utilisés.
export type RideRow = TableRow<"rides">;
export type RideStatus = DbEnum<"ride_status">;
export type VehicleCategory = DbEnum<"vehicle_category">;
export type PaymentMethod = DbEnum<"payment_method">;
export type ProfileRow = TableRow<"profiles">;
export type DriverRow = TableRow<"drivers">;
export type NotificationRow = TableRow<"notifications">;
export type LandmarkRow = TableRow<"landmarks">;
