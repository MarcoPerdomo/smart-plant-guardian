const DEFAULT_APP_URL = "https://sentia-plants.com";

/**
 * Returns the public site URL used in email links. Falls back to the
 * production domain when APP_URL is missing or malformed (not an http(s) URL),
 * so a bad secret can never produce broken links in emails.
 */
export function resolveAppUrl(): string {
  const raw = (process.env["APP_URL"] ?? "").trim();
  if (/^https?:\/\/[a-z0-9.-]+(:\d+)?(\/.*)?$/i.test(raw)) {
    return raw.replace(/\/+$/, "");
  }
  return DEFAULT_APP_URL;
}
