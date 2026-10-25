import type { SardanapalHttpClient } from '@sardanapal/client';
import type { SardanapalAuthService } from '@sardanapal/identity-client';

/**
 * Placeholder that keeps the package buildable until the first control lands.
 * It also proves both client packages resolve from the Angular library.
 */
export class SardanapalNgInfo {
  /** Prefix of every control selector, for example `s-text-box`. */
  static readonly SELECTOR_PREFIX = 's';

  /** Types the Angular bridge will wrap. */
  readonly clientTypes?: {
    http: SardanapalHttpClient;
    auth: SardanapalAuthService;
  };
}
