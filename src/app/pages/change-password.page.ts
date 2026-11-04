import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SardanapalChangePasswordComponent } from '@harpm/sardanapal-ng';
import { DemoReturnUrl } from '../demo-return-url';

@Component({
  selector: 'app-change-password-page',
  imports: [SardanapalChangePasswordComponent],
  template: `<s-change-password (changed)="onChanged()" />`,
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
