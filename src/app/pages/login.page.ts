import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import type { Session } from '@harpm/sardanapal-identity-client';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { SardanapalLoginComponent, SardanapalLoginPlacement } from '@harpm/sardanapal-ng';
import { DemoReturnUrl } from '../demo-return-url';
import { DemoPageComponent } from './demo-page.component';

/** Login control. A successful sign-in follows `returnUrl`, which the guards set. */
@Component({
  selector: 'app-login-page',
  imports: [DemoPageComponent, NzButtonModule, SardanapalLoginComponent],
  styles: `
    .placement {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 0 0 16px;
    }

    .login-frame {
      height: min(560px, 70vh);
      min-height: 360px;
      width: 100%;
      border: 1px solid #d9d9d9;
      border-radius: 8px;
      overflow: hidden;
    }

    .login-bg {
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #1677ff, #69b1ff);
    }

    @media (max-width: 600px) {
      .login-frame {
        height: 70vh;
        border-radius: 0;
      }
    }
  `,
  template: `
    <app-demo-page
      selector="s-login"
      title="Login"
      lead="Password and OTP sign-in. A successful sign-in follows returnUrl, or Secure. Placement moves the card over the optional background."
    >
      <p class="placement">
        <button nz-button type="button" [nzType]="placementType(Placement.Left)" (click)="placeLogin(Placement.Left)">
          Left
        </button>
        <button nz-button type="button" [nzType]="placementType(Placement.Middle)" (click)="placeLogin(Placement.Middle)">
          Middle
        </button>
        <button nz-button type="button" [nzType]="placementType(Placement.Right)" (click)="placeLogin(Placement.Right)">
          Right
        </button>
      </p>
      <div class="login-frame">
        <s-login
          [placement]="loginPlacement"
          [background]="loginBg"
          [role]="1"
          (loggedIn)="onLoggedIn($event)"
        />
      </div>
      <ng-template #loginBg>
        <div class="login-bg"></div>
      </ng-template>
    </app-demo-page>
  `,
})
export class LoginPageComponent {
  protected readonly Placement = SardanapalLoginPlacement;
  protected loginPlacement = SardanapalLoginPlacement.Middle;

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected placeLogin(placement: SardanapalLoginPlacement): void {
    this.loginPlacement = placement;
  }

  protected placementType(placement: SardanapalLoginPlacement): 'primary' | 'default' {
    return this.loginPlacement === placement ? 'primary' : 'default';
  }

  protected onLoggedIn(session: Session): void {
    const fallback = session.mustChangePassword ? '/change-password' : '/secure';
    const returnUrl = DemoReturnUrl.resolve(
      this.route.snapshot.queryParamMap.get('returnUrl'),
      fallback,
    );
    void this.router.navigateByUrl(returnUrl);
  }
}
