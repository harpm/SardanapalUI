import type {
  SardanapalDirectionServiceOptions,
  SardanapalHttpClientOptions,
} from '@harpm/sardanapal-client';
import type { SardanapalAuthServiceOptions } from '@harpm/sardanapal-identity-client';

<<<<<<< Updated upstream
=======
<<<<<<< Updated upstream
=======
>>>>>>> Stashed changes
/** Redirect paths used by the route guards. Defaults match a typical host layout. */
export interface SardanapalNgGuardOptions {
  /** Where `AuthorizeGuard` sends an anonymous user. Default `/login`. */
  loginUrl?: string;
  /** Where `ChangePasswordGuard` sends a `mustChangePassword` session. Default `/change-password`. */
  changePasswordUrl?: string;
  /** Where `HasRoleGuard` sends a signed-in user without the required role. Default `/unauthorized`. */
  unauthorizedUrl?: string;
}

<<<<<<< Updated upstream
=======
/** Where a 404 sends the user, and whether API 404s redirect at all. */
export interface SardanapalNgNotFoundOptions {
  /** Route that mounts `s-not-found`. Default `/not-found`. */
  url?: string;
  /** Send the user there when a request fails with HTTP 404. Defaults to `true`. */
  redirect?: boolean;
}

>>>>>>> Stashed changes
>>>>>>> Stashed changes
export interface SardanapalNgOptions {
  /** Base URL of the host app that exposes the Core and Identity service bases. */
  apiBaseUrl: string;
  /** Extra options for the shared HTTP client. */
  http?: Pick<SardanapalHttpClientOptions, 'adapter' | 'errors'>;
  /** Options for the auth service. It registers its interceptor on the shared HTTP client. */
  auth?: Omit<SardanapalAuthServiceOptions, 'client'>;
  /** Options for the direction service. */
  direction?: SardanapalDirectionServiceOptions;
  /** Show every failed request as an ng-zorro toast. Defaults to `true`. */
  errorToasts?: boolean;
<<<<<<< Updated upstream
  /** Redirect URLs for the authorize, change-password and has-role guards. */
  guards?: SardanapalNgGuardOptions;
=======
<<<<<<< Updated upstream
=======
  /** Redirect URLs for the authorize, change-password and has-role guards. */
  guards?: SardanapalNgGuardOptions;
  /** The 404 fallback: where `SardanapalNgNotFoundInterceptor` sends the user. */
  notFound?: SardanapalNgNotFoundOptions;
>>>>>>> Stashed changes
>>>>>>> Stashed changes
}
