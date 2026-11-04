import { Component, inject } from '@angular/core';
import { SARDANAPAL_AUTH_SERVICE } from '@harpm/sardanapal-ng';

@Component({
  selector: 'app-admin-page',
  template: `
    <h2>Admin</h2>
    <p>Requires the <code>admin</code> role. You have: {{ session.claims?.roles?.join(', ') || '(none)' }}.</p>
  `,
})
export class AdminPageComponent {
  protected readonly session = inject(SARDANAPAL_AUTH_SERVICE).getSession();
}
