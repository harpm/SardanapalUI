import { InjectionToken } from '@angular/core';
import type { SardanapalDirectionService, SardanapalHttpClient } from '@sardanapal/client';
import type { SardanapalAuthService } from '@sardanapal/identity-client';
import type { SardanapalNgOptions } from './options';

/** The options passed to `SardanapalNg.providers`. */
export const SARDANAPAL_NG_OPTIONS = new InjectionToken<SardanapalNgOptions>('SARDANAPAL_NG_OPTIONS');

/** The shared HTTP client. Every CRUD, panel and account client should send through it. */
export const SARDANAPAL_HTTP_CLIENT = new InjectionToken<SardanapalHttpClient>('SARDANAPAL_HTTP_CLIENT');

/** The auth service, built on `SARDANAPAL_HTTP_CLIENT` so calls carry the `AUTH` header. */
export const SARDANAPAL_AUTH_SERVICE = new InjectionToken<SardanapalAuthService>('SARDANAPAL_AUTH_SERVICE');

/** The page direction owner. */
export const SARDANAPAL_DIRECTION_SERVICE = new InjectionToken<SardanapalDirectionService>(
  'SARDANAPAL_DIRECTION_SERVICE',
);
