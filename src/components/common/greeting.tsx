"use client";

import { useSyncExternalStore } from "react";

function greetingFor(hour: number) {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const subscribe = () => () => {};

/** Begrüßung nach lokaler Uhrzeit des Geräts (nicht der Server-Zeit). */
export function Greeting({ name }: { name: string }) {
  const text = useSyncExternalStore(
    subscribe,
    () => greetingFor(new Date().getHours()),
    () => "Hello",
  );
  return (
    <>
      {text}, {name} <span aria-hidden>👋</span>
    </>
  );
}
