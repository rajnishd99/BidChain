"use client";

import { useLiveEvents } from "@/hooks/useLiveEvents";

import { EventFeed } from "./EventFeed";

export function LiveEvents() {
  const { events, error } = useLiveEvents();
  if (error)
    return (
      <div className="banner warning">
        Event stream unavailable. {error}
      </div>
    );
  return <EventFeed events={events.slice(0, 25)} />;
}
