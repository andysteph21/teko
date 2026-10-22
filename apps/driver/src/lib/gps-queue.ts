import type { GpsQueueStorage, QueuedGpsPoint } from "@teko/core";
import * as SQLite from "expo-sqlite";

let database: Promise<SQLite.SQLiteDatabase> | undefined;
async function open() {
  database ??= SQLite.openDatabaseAsync("teko-driver-gps.db").then(async (db) => {
    await db.execAsync(`pragma journal_mode=WAL;
      create table if not exists gps_queue(id text primary key,userId text not null,
        rideId text not null,lon real not null,lat real not null,recordedAt integer not null);
      create index if not exists gps_queue_owner_time on gps_queue(userId,recordedAt);`);
    return db;
  });
  return database;
}
export const gpsQueue: GpsQueueStorage = {
  async purge(userId, before) {
    const db = await open();
    await db.runAsync("delete from gps_queue where userId<>? or recordedAt<=?", userId, before);
  },
  async read(userId, limit) {
    return (await open()).getAllAsync<QueuedGpsPoint>(
      "select * from gps_queue where userId=? order by recordedAt,id limit ?",
      userId,
      limit,
    );
  },
  async remove(id) {
    await (await open()).runAsync("delete from gps_queue where id=?", id);
  },
};
export async function enqueueGpsPoint(point: Omit<QueuedGpsPoint, "id">): Promise<void> {
  const id = `${point.userId}:${point.recordedAt}:${Math.random().toString(36).slice(2)}`;
  await (await open()).runAsync(
    "insert into gps_queue(id,userId,rideId,lon,lat,recordedAt) values(?,?,?,?,?,?)",
    id,
    point.userId,
    point.rideId,
    point.lon,
    point.lat,
    point.recordedAt,
  );
}
export async function clearGpsQueue(): Promise<void> {
  await (await open()).runAsync("delete from gps_queue");
}
