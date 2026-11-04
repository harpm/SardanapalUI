import { Component, inject } from '@angular/core';
import { SARDANAPAL_AUTH_SERVICE } from '@harpm/sardanapal-ng';
import { DemoPageComponent } from './demo-page.component';

/** Route behind Authorize and ChangePassword. */
@Component({
  selector: 'app-secure-page',
  imports: [DemoPageComponent],
  template: `
    <app-demo-page
      title="Secure"
      lead="Reached only with a token, and only when the token does not require a password change."
    >
      <p>
        Signed in as {{ session.claims?.id ?? '(no id)' }}. Roles:
        {{ session.claims?.roles?.join(', ') || '(none)' }}.
      </p>
    </app-demo-page>
  `,
})
export class SecurePageComponent {
  protected readonly session = inject(SARDANAPAL_AUTH_SERVICE).getSession();
}
