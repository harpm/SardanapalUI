import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SardanapalChangePasswordComponent } from '@harpm/sardanapal-ng';
import { DemoReturnUrl } from '../demo-return-url';
import { DemoPageComponent } from './demo-page.component';

/** Change-password control. A successful change follows `returnUrl`. */
@Component({
  selector: 'app-change-password-page',
  imports: [DemoPageComponent, SardanapalChangePasswordComponent],
  template: `
    <app-demo-page
      selector="s-change-password"
      title="Change password"
      lead="Proves the current password, then signs in again with the new one. A successful change follows returnUrl, or Secure."
    >
      <div class="demo-form">
        <s-change-password (changed)="onChanged()" />
      </div>
    </app-demo-page>
  `,
})
export class ChangePasswordPageComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected onChanged(): void {
    const returnUrl = DemoReturnUrl.resolve(
      this.route.snapshot.queryParamMap.get('returnUrl'),
      '/secure',
    );
    void this.router.navigateByUrl(returnUrl);
  }
}
