import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import type { Session } from '@harpm/sardanapal-identity-client';
import { SardanapalLoginComponent, SardanapalLoginPlacement } from '@harpm/sardanapal-ng';
import { DemoReturnUrl } from '../demo-return-url';

@Component({
  selector: 'app-login-page',
  imports: [SardanapalLoginComponent],
  styles: [
    `
      :host {
        display: block;
        height: min(560px, 80vh);
        min-height: 360px;
      }
    `,
  ],
  template: `
    <s-login
      [placement]="Placement.Middle"
      [role]="1"
      (loggedIn)="onLoggedIn($event)"
    />
  `,
})
export class LoginPageComponent {
  protected readonly Placement = SardanapalLoginPlacement;

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected onLoggedIn(session: Session): void {
    const fallback = session.mustChangePassword ? '/change-password' : '/secure';
    const returnUrl = DemoReturnUrl.resolve(
      this.route.snapshot.queryParamMap.get('returnUrl'),
      fallback,
    );
    void this.router.navigateByUrl(returnUrl);
  }
}
