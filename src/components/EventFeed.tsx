"use client";

import { eventLabel, type AuctionEvent } from "@/lib/events";

export function EventFeed({ events }: { events: AuctionEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="event-feed empty">
        <p>Waiting for live events…</p>
      </div>
    );
  }
  return (
    <div className="event-feed">
      {events.map((e, i) => (
        <div className={`event event-${e.type}`} key={`${e.type}-${i}`}>
          <span className="event-tag">{e.type.replace("Auction", "")}</span>
          <span className="event-body">{eventLabel(e)}</span>
        </div>
      ))}
    </div>
  );
}
