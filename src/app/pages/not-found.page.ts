import { Component } from '@angular/core';
import { SardanapalNotFoundComponent } from '@harpm/sardanapal-ng';
import { DemoPageComponent } from './demo-page.component';

/** Display-only 404 page: the wildcard route and the 404 interceptor land here. */
@Component({
  selector: 'app-not-found-page',
  imports: [DemoPageComponent, SardanapalNotFoundComponent],
  template: `
    <app-demo-page
      selector="s-not-found"
      title="Not found"
      lead="Display-only 404 page. The wildcard route lands unknown URLs here, and the 404 interceptor sends a failed request here."
    >
      <s-not-found />
    </app-demo-page>
  `,
})
export class NotFoundPageComponent {}
