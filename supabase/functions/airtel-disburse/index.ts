// Point d'entrée servi — la logique vit dans handler.ts (module pur, testé
// sans base). Seul cet index charge supabase-js et injecte le vrai client ;
// le rétrécissement vers la surface Db est volontaire.
import { admin } from "../_shared/db.ts";
import type { Db } from "../_shared/db_types.ts";
import { handleDisburse } from "./handler.ts";

Deno.serve((req) => handleDisburse(req, admin() as unknown as Db));
