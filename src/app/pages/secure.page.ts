import { Component, inject } from '@angular/core';
import { SARDANAPAL_AUTH_SERVICE } from '@harpm/sardanapal-ng';

@Component({
  selector: 'app-secure-page',
  template: `
    <h2>Secure</h2>
    <p>
      Signed in as {{ session.claims?.id ?? '(no id)' }}. Roles:
      {{ session.claims?.roles?.join(', ') || '(none)' }}.
    </p>
  `,
})
export class SecurePageComponent {
  protected readonly session = inject(SARDANAPAL_AUTH_SERVICE).getSession();
}
