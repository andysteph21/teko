import type { RideHistoryCache } from "@teko/api-client";
import type { RideRow } from "@teko/types";
import * as SQLite from "expo-sqlite";

let database: Promise<SQLite.SQLiteDatabase> | undefined;
let owner: string | null | undefined;
async function open() {
  database ??= SQLite.openDatabaseAsync("teko-history.db").then(async (db) => {
    await db.execAsync(
      "create table if not exists history_cache(user_id text primary key, payload text not null)",
    );
    return db;
  });
  return database;
}
export function setHistoryCacheOwner(next: string | null): void {
  const previous = owner;
  owner = next;
  if (previous !== undefined || next === null) {
    void open()
      .then((db) =>
        next
          ? db.runAsync("delete from history_cache where user_id<>?", next)
          : db.runAsync("delete from history_cache"),
      )
      .catch(() => undefined);
  }
}
export const historyCache: RideHistoryCache = {
  async read(userId) {
    if (userId !== owner) return null;
    const row = await (await open()).getFirstAsync<{ payload: string }>(
      "select payload from history_cache where user_id=?",
      userId,
    );
    return row ? (JSON.parse(row.payload) as RideRow[]) : null;
  },
  async write(userId, rows) {
    if (userId !== owner) return;
    const db = await open();
    if (userId !== owner) return;
    await db.runAsync(
      "insert into history_cache(user_id,payload) values(?,?) on conflict(user_id) do update set payload=excluded.payload",
      userId,
      JSON.stringify(rows),
    );
  },
};
