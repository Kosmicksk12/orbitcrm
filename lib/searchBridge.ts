// A tiny bridge to hand off a search term from the global Ctrl+K palette to
// whichever page the user navigates to next. Using sessionStorage instead of
// URL query params keeps this simple — no useSearchParams/Suspense boundary
// needed on every destination page, and it still works with client-side
// navigation.
const PREFIX = "orbitcrm:pending-search:";

export function setPendingSearch(scope: "orders" | "clients", query: string) {
  try {
    sessionStorage.setItem(PREFIX + scope, query);
  } catch {
    // Ignore — worst case the destination page just opens with no prefill.
  }
}

export function consumePendingSearch(scope: "orders" | "clients"): string | null {
  try {
    const key = PREFIX + scope;
    const value = sessionStorage.getItem(key);
    if (value) sessionStorage.removeItem(key);
    return value;
  } catch {
    return null;
  }
}
