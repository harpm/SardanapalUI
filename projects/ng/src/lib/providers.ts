import {
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
  type EnvironmentProviders,
} from '@angular/core';
import { SardanapalDirectionService, SardanapalHttpClient } from '@sardanapal/client';
import { SardanapalAuthService } from '@sardanapal/identity-client';
import { SardanapalNgDirectionBridge } from './direction-bridge';
import { SardanapalNgErrorToasts } from './error-toasts';
import type { SardanapalNgOptions } from './options';
import {
  SARDANAPAL_AUTH_SERVICE,
  SARDANAPAL_DIRECTION_SERVICE,
  SARDANAPAL_HTTP_CLIENT,
  SARDANAPAL_NG_OPTIONS,
} from './tokens';

/**
 * Entry point for an Angular host. Registers the shared HTTP client, the auth
 * service and the direction service under their tokens, and starts the direction
 * bridge and (unless turned off) the error toasts.
 *
 * ```ts
 * export const appConfig: ApplicationConfig = {
 *   providers: [SardanapalNg.providers({ apiBaseUrl: 'https://host/api' })],
 * };
 * ```
 */
export class SardanapalNg {
  private constructor() {}

  static providers(options: SardanapalNgOptions): EnvironmentProviders {
    if (!options?.apiBaseUrl?.trim()) {
      throw new Error('apiBaseUrl is required.');
    }

    return makeEnvironmentProviders([
      { provide: SARDANAPAL_NG_OPTIONS, useValue: options },
      { provide: SARDANAPAL_HTTP_CLIENT, useFactory: SardanapalNg.createHttpClient },
      { provide: SARDANAPAL_AUTH_SERVICE, useFactory: SardanapalNg.createAuthService },
      { provide: SARDANAPAL_DIRECTION_SERVICE, useFactory: SardanapalNg.createDirectionService },
      provideEnvironmentInitializer(() => SardanapalNg.start()),
    ]);
  }

  private static createHttpClient(): SardanapalHttpClient {
    const options = inject(SARDANAPAL_NG_OPTIONS);
    return new SardanapalHttpClient({ ...options.http, apiBaseUrl: options.apiBaseUrl });
  }

  private static createAuthService(): SardanapalAuthService {
    const options = inject(SARDANAPAL_NG_OPTIONS);
    return new SardanapalAuthService({ ...options.auth, client: inject(SARDANAPAL_HTTP_CLIENT) });
  }

  private static createDirectionService(): SardanapalDirectionService {
    return new SardanapalDirectionService(inject(SARDANAPAL_NG_OPTIONS).direction);
  }

  /** Creates the services that must listen from the start. */
  private static start(): void {
    inject(SardanapalNgDirectionBridge);
    if (inject(SARDANAPAL_NG_OPTIONS).errorToasts !== false) {
      inject(SardanapalNgErrorToasts);
    }
  }
}
