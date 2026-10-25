import { Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Response, type SardanapalHttpError } from '@sardanapal/client';
import { NzMessageService } from 'ng-zorro-antd/message';
import { SARDANAPAL_HTTP_CLIENT } from './tokens';

/**
 * Shows every failed request as an ng-zorro toast. It listens to the shared
 * client's `httpError$`, so each failure is shown once.
 *
 * A 2xx body with a failure `statusCode` is not an error and is not shown here:
 * the caller checks `isSuccess` and shows `userMessage` itself. A password-change
 * 403 is a state, not a failure, so it is skipped: the app should send the user to
 * the change-password page.
 */
@Injectable({ providedIn: 'root' })
export class SardanapalNgErrorToasts {
  private readonly message = inject(NzMessageService);

  constructor() {
    inject(SARDANAPAL_HTTP_CLIENT)
      .httpError$.pipe(takeUntilDestroyed())
      .subscribe((error) => this.show(error));
  }

  /** The host's `userMessage` when the error body is an envelope that has one, else the error message. */
  static textOf(error: SardanapalHttpError): string {
    const body = error.body;
    if (Response.isEnvelope(body) && body.userMessage?.trim()) {
      return body.userMessage;
    }
    return error.message;
  }

  private show(error: SardanapalHttpError): void {
    if (error.mustChangePassword) {
      return;
    }
    this.message.error(SardanapalNgErrorToasts.textOf(error));
  }
}
