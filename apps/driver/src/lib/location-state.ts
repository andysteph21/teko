import * as SQLite from "expo-sqlite";

export interface DriverLocationState {
  userId: string;
  online: boolean;
  rideId: string | null;
  eco: boolean;
  lastHeartbeatAt: number;
  lastRideCheckAt: number;
}
let database: Promise<SQLite.SQLiteDatabase> | undefined;
async function open() {
  database ??= SQLite.openDatabaseAsync("teko-location-service.db").then(async (db) => {
    await db.execAsync(
      "create table if not exists service_state(id integer primary key check(id=1), payload text not null)",
    );
    return db;
  });
  return database;
}
export async function readLocationState(): Promise<DriverLocationState | null> {
  const row = await (await open()).getFirstAsync<{ payload: string }>(
    "select payload from service_state where id=1",
  );
  return row ? (JSON.parse(row.payload) as DriverLocationState) : null;
}
export async function writeLocationState(state: DriverLocationState): Promise<void> {
  await (await open()).runAsync(
    "insert into service_state(id,payload) values(1,?) on conflict(id) do update set payload=excluded.payload",
    JSON.stringify(state),
  );
}
export async function clearLocationState(): Promise<void> {
  await (await open()).runAsync("delete from service_state");
}

/** Une réponse réseau ancienne ne doit pas annuler un nouveau geste utilisateur. */
export async function replaceLocationState(
  expected: DriverLocationState,
  next: DriverLocationState,
): Promise<boolean> {
  const result = await (await open()).runAsync(
    "update service_state set payload=? where id=1 and payload=?",
    JSON.stringify(next),
    JSON.stringify(expected),
  );
  return result.changes === 1;
}
