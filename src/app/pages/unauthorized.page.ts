import { Component } from '@angular/core';
import { SardanapalUnauthorizedComponent } from '@harpm/sardanapal-ng';

@Component({
  selector: 'app-unauthorized-page',
  imports: [SardanapalUnauthorizedComponent],
  template: `<s-unauthorized />`,
})
export class UnauthorizedPageComponent {}
