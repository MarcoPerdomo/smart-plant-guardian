const PRODUCTION_APP_URL = "https://sentia-plants.com";

/**
 * Returns the public site URL used in email links.
 *
 * Always the production domain. Email links must point at the live site no
 * matter which environment sent them, and relying on the APP_URL secret
 * produced broken links when it held a bad value in a deployment.
 */
export function resolveAppUrl(): string {
  return PRODUCTION_APP_URL;
}
