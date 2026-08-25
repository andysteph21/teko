"use client";

// Flux « Activité récente » (A-02 / AM-01) — courses + incidents fusionnés.
// Les SOS sont cliquables et mènent à la page incidents.

import Link from "next/link";
import type { ActivityEvent, PillTone } from "./activity";
import { formatEventTime } from "./activity";

const PILL_CLASSES: Record<PillTone, string> = {
  ok: "bg-success-light text-success-dark",
  warn: "bg-warning-light text-warning-dark",
  err: "bg-error-light text-error-dark",
};

function EventLine({ event }: { event: ActivityEvent }) {
  const body = (
    <>
      <span className="flex-none pt-px font-mono text-[11px] text-neutral-400">
        {formatEventTime(event.at)}
      </span>
      <span className="min-w-0 flex-1">
        <b className={`font-semibold ${event.isSos ? "text-error-dark" : ""}`}>{event.label}</b>
        {event.detail ? <> — {event.detail}</> : null}
      </span>
      <span
        className={`ml-auto flex-none rounded-full px-2 py-0.5 text-[10px] font-extrabold ${PILL_CLASSES[event.pill.tone]}`}
      >
        {event.pill.text}
      </span>
    </>
  );
  const className =
    "flex items-start gap-2.5 border-b border-neutral-100 px-4 py-2.5 text-[12.5px] text-neutral-700 last:border-b-0";
  if (event.isSos) {
    return (
      <Link href="/incidents" data-testid={`feed-sos-${event.id}`} className={className}>
        {body}
      </Link>
    );
  }
  return <div className={className}>{body}</div>;
}

interface ActivityFeedProps {
  events: ActivityEvent[];
  loading?: boolean;
}

export function ActivityFeed({ events, loading }: ActivityFeedProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[14px] border border-neutral-200 bg-neutral-0">
      <header className="border-b border-neutral-100 px-4 py-3 text-[13.5px] font-bold text-neutral-900">
        Activité récente
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {events.map((event) => (
          <EventLine key={event.id} event={event} />
        ))}
        {events.length === 0 ? (
          <p className="px-4 py-6 text-xs text-neutral-400">
            {loading ? "Chargement…" : "Aucune activité récente."}
          </p>
        ) : null}
      </div>
    </section>
  );
}
