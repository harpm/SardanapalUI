import { Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import type { SardanapalHttpError } from '@harpm/sardanapal-client';
import { SARDANAPAL_HTTP_CLIENT, SARDANAPAL_NG_OPTIONS } from './tokens';

/**
 * Sends the user to the not-found page when a request fails with HTTP 404. It
 * listens to the shared client's `httpError$`, so each failure is handled once.
 *
 * A 2xx body with `statusCode` `NotExists` (`4`) is not a 404 and is not
 * redirected: the caller checks `isSuccess` and shows `userMessage` itself.
 * The redirect targets `options.notFound.url` (default `/not-found`) and does
 * nothing when the user is already there.
 */
@Injectable({ providedIn: 'root' })
export class SardanapalNgNotFoundInterceptor {
  static readonly DEFAULT_URL = '/not-found';

  /** Optional because a host may register the providers without a router. */
  private readonly router = inject(Router, { optional: true });
  private readonly options = inject(SARDANAPAL_NG_OPTIONS);

  constructor() {
    inject(SARDANAPAL_HTTP_CLIENT)
      .httpError$.pipe(takeUntilDestroyed())
      .subscribe((error) => this.handle(error));
  }

  /** Where a 404 sends the user. */
  notFoundUrl(): string {
    return this.options.notFound?.url?.trim() || SardanapalNgNotFoundInterceptor.DEFAULT_URL;
  }

  private handle(error: SardanapalHttpError): void {
    if (!this.router || error.status !== 404 || this.router.url === this.notFoundUrl()) {
      return;
    }
    void this.router.navigateByUrl(this.notFoundUrl());
  }
}
