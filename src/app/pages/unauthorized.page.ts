import { Component } from '@angular/core';
import { SardanapalUnauthorizedComponent } from '@harpm/sardanapal-ng';
import { DemoPageComponent } from './demo-page.component';

/** Display-only 403 page the HasRole guard redirects to. */
@Component({
  selector: 'app-unauthorized-page',
  imports: [DemoPageComponent, SardanapalUnauthorizedComponent],
  template: `
    <app-demo-page
      selector="s-unauthorized"
      title="Unauthorized"
      lead="Display-only 403 page. HasRole sends a signed-in user here when the required role is missing."
    >
      <s-unauthorized />
    </app-demo-page>
  `,
})
export class UnauthorizedPageComponent {}
