import { useSyncExternalStore } from "react";

/**
 * Geteilter Zustand der globalen Rollen-Leiste (siehe
 * `components/domain/role-indicator-banner.tsx`).
 *
 * Der Offen/Zu-Zustand wird in `localStorage` gehalten und über
 * `useSyncExternalStore` gelesen — dadurch hydration-sicher (Server-Snapshot =
 * geschlossen) und ohne `setState` in Effekten. Andere Client-Komponenten (z. B.
 * das Account-Menü) können denselben Zustand lesen, um Aktionen zu sperren,
 * solange die Leiste eingeblendet ist.
 *
 * Standard ist «geschlossen»; ist die Leiste nicht eingeblendet, verhält sich
 * die App exakt wie zuvor.
 */

const STORAGE_KEY = "nta-role-banner-open";
const STORE_EVENT = "nta-role-banner-change";

export function subscribeToRoleBanner(callback: () => void): () => void {
  window.addEventListener(STORE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(STORE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function getRoleBannerOpenSnapshot(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function getServerRoleBannerSnapshot(): boolean {
  return false;
}

export function setRoleBannerOpen(next: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  } catch {
    // Persistenz ist optional.
  }
  window.dispatchEvent(new Event(STORE_EVENT));
}

/** Reaktiver Lesezugriff auf den Offen-Zustand der Rollen-Leiste. */
export function useRoleBannerOpen(): boolean {
  return useSyncExternalStore(
    subscribeToRoleBanner,
    getRoleBannerOpenSnapshot,
    getServerRoleBannerSnapshot,
  );
}
