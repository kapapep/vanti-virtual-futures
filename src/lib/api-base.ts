/** Deployed web origin used by the native shell, which serves files from capacitor://. */
const NATIVE_API_ORIGIN =
  import.meta.env["VITE_API_BASE_URL"] || "https://vanti-virtual-futures.lovable.app";

/**
 * Base URL for HTTP API routes. Empty string (same origin) on the web, and the
 * deployed origin when running inside the native Capacitor shell.
 */
export function apiBaseUrl(): string {
  if (typeof window === "undefined") return "";
  return window.location.protocol.startsWith("http") ? "" : NATIVE_API_ORIGIN;
}
