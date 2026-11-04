import type {
  SardanapalDirectionServiceOptions,
  SardanapalHttpClientOptions,
} from '@harpm/sardanapal-client';
import type { SardanapalAuthServiceOptions } from '@harpm/sardanapal-identity-client';

/** Redirect paths used by the route guards. Defaults match a typical host layout. */
export interface SardanapalNgGuardOptions {
  /** Where `AuthorizeGuard` sends an anonymous user. Default `/login`. */
  loginUrl?: string;
  /** Where `ChangePasswordGuard` sends a `mustChangePassword` session. Default `/change-password`. */
  changePasswordUrl?: string;
  /** Where `HasRoleGuard` sends a signed-in user without the required role. Default `/unauthorized`. */
  unauthorizedUrl?: string;
}

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
  /** Redirect URLs for the authorize, change-password and has-role guards. */
  guards?: SardanapalNgGuardOptions;
}
