import { Component, inject } from '@angular/core';
import { SARDANAPAL_AUTH_SERVICE } from '@harpm/sardanapal-ng';
import { DemoPageComponent } from './demo-page.component';

/** Route behind Authorize, ChangePassword, and HasRole for admin. */
@Component({
  selector: 'app-admin-page',
  imports: [DemoPageComponent],
  template: `
    <app-demo-page
      title="Admin"
      lead="Same checks as Secure, plus the admin role. A signed-in user without that role is sent to Unauthorized."
    >
      <p>You have: {{ session.claims?.roles?.join(', ') || '(none)' }}.</p>
    </app-demo-page>
  `,
})
export class AdminPageComponent {
  protected readonly session = inject(SARDANAPAL_AUTH_SERVICE).getSession();
}
