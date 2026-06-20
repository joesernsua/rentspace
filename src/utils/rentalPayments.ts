const paidRequestStorageKey = "rentspace-paid-requests";

export function getPaidRequestIds() {
  if (typeof window === "undefined") return new Set<string>();

  try {
    const ids = JSON.parse(window.localStorage.getItem(paidRequestStorageKey) || "[]");
    return new Set(Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : []);
  } catch {
    return new Set<string>();
  }
}

export function savePaidRequestId(requestId: string) {
  const ids = getPaidRequestIds();
  ids.add(requestId);
  window.localStorage.setItem(paidRequestStorageKey, JSON.stringify([...ids]));
}
