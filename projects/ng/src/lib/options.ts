import type {
  SardanapalDirectionServiceOptions,
  SardanapalHttpClientOptions,
} from '@harpm/sardanapal-client';
import type { SardanapalAuthServiceOptions } from '@harpm/sardanapal-identity-client';

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
}
