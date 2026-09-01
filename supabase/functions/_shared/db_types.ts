// Surface minimale du client Postgrest utilisée par les handlers de paiement.
// Module pur (aucun import) : les handlers et leurs tests ne chargent jamais
// supabase-js — seul index.ts injecte le vrai client (admin(), cf. db.ts).
export type DbRow = Record<string, unknown>;

export interface DbSelectFilter {
  single(): PromiseLike<{ data: DbRow | null; error: unknown }>;
}

export interface DbUpdateFilter {
  neq(col: string, val: unknown): unknown;
}

export interface DbTable {
  select(columns?: string): { eq(col: string, val: unknown): DbSelectFilter };
  update(payload: DbRow): { eq(col: string, val: unknown): DbUpdateFilter };
}

export interface Db {
  from(table: string): DbTable;
  rpc(fn: string, args?: DbRow): PromiseLike<{ error: { message: string } | null }>;
}
