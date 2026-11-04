import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TextDirection } from '@harpm/sardanapal-client';
import { NzButtonModule } from 'ng-zorro-antd/button';
import {
  SARDANAPAL_AUTH_SERVICE,
  SARDANAPAL_DIRECTION_SERVICE,
  SardanapalNgLocaleService,
} from '@harpm/sardanapal-ng';
import { DemoJwt } from './demo-jwt';

@Component({
  selector: 'app-root',
  imports: [NzButtonModule, RouterLink, RouterLinkActive, RouterOutlet],
  styleUrl: './app.component.css',
  templateUrl: './app.component.html',
})
export class AppComponent {
  protected readonly locale = inject(SardanapalNgLocaleService);
  private readonly direction = inject(SARDANAPAL_DIRECTION_SERVICE);
  private readonly auth = inject(SARDANAPAL_AUTH_SERVICE);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly sessionSummary = signal(this.formatSession());

  constructor() {
    this.auth.session$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.sessionSummary.set(this.formatSession());
    });
  }

  protected signInViewer(): void {
    this.auth.setToken(
      DemoJwt.encode({
        id: 'viewer-1',
        exp: Math.floor(Date.now() / 1000) + 3600,
        sd_roles: 'viewer',
      }),
    );
  }

  protected signInAdmin(): void {
    this.auth.setToken(
      DemoJwt.encode({
        id: 'admin-1',
        exp: Math.floor(Date.now() / 1000) + 3600,
        sd_roles: ['admin', 'viewer'],
      }),
    );
  }

  protected signInMustChangePassword(): void {
    this.auth.setToken(
      DemoJwt.encode({
        id: 'must-change-1',
        exp: Math.floor(Date.now() / 1000) + 3600,
        sd_roles: 'viewer',
        must_change_pw: 'true',
      }),
    );
  }

  protected signOut(): void {
    this.auth.logout();
  }

  /** Language and direction are separate services, so the app sets both. */
  protected useEnglish(): void {
    this.locale.setCulture('en');
    this.direction.setDirection(TextDirection.Ltr);
  }

  protected usePersian(): void {
    this.locale.setCulture('fa-IR');
    this.direction.setDirection(TextDirection.Rtl);
  }

  private formatSession(): string {
    const session = this.auth.getSession();
    if (!session.token) {
      return 'anonymous';
    }
    const roles = session.claims?.roles?.join(', ') || '(none)';
    return `id=${session.claims?.id ?? '?'}, roles=${roles}, mustChangePassword=${session.mustChangePassword}`;
  }
}
