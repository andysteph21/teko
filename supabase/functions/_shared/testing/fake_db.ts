// Faux client pour tester les Edge Functions sans base : sert des lignes
// fixes par table (select .eq .single), enregistre les updates (payload +
// filtres) et les appels RPC, avec l'ordre global des opérations dans `ops`.
// Typé Db : le compilateur garantit qu'il expose la surface des handlers.
import type { Db } from "../db_types.ts";

type Row = Record<string, unknown>;

export interface FakeUpdate {
  table: string;
  payload: Row;
  filters: string[];
}

export interface FakeRpc {
  fn: string;
  args: Row;
}

export interface FakeTables {
  payments?: Row | null;
  drivers?: Row | null;
  profiles?: Row | null;
  rides?: Row | null;
}

interface UpdateChain {
  eq(col: string, val: unknown): UpdateChain;
  neq(col: string, val: unknown): UpdateChain;
}

export function fakeDb(tables: FakeTables, opts: { rpcError?: { message: string } } = {}) {
  const updates: FakeUpdate[] = [];
  const rpcs: FakeRpc[] = [];
  const ops: string[] = [];
  const rows = tables as Record<string, Row | null | undefined>;

  const client: Db = {
    from(table: string) {
      return {
        select(_columns?: string) {
          return {
            eq(_col: string, _val: unknown) {
              return {
                single() {
                  return Promise.resolve({ data: rows[table] ?? null, error: null });
                },
              };
            },
          };
        },
        update(payload: Row) {
          const rec: FakeUpdate = { table, payload, filters: [] };
          updates.push(rec);
          ops.push(`update:${table}:${Object.keys(payload).sort().join(",")}`);
          const chain: UpdateChain = {
            eq(col, val) {
              rec.filters.push(`eq:${col}=${String(val)}`);
              return chain;
            },
            neq(col, val) {
              rec.filters.push(`neq:${col}=${String(val)}`);
              return chain;
            },
          };
          return chain;
        },
      };
    },
    rpc(fn: string, args: Row) {
      rpcs.push({ fn, args });
      ops.push(`rpc:${fn}`);
      return Promise.resolve({ data: null, error: opts.rpcError ?? null });
    },
  };

  return { client, updates, rpcs, ops };
}
