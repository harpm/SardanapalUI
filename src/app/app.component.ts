import { Component } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { SardanapalNgInfo } from '@sardanapal/ng';

@Component({
  selector: 'app-root',
  imports: [NzButtonModule],
  template: `
    <h1>Sardanapal UI demo</h1>
    <p>Control selector prefix: {{ prefix }}</p>
    <button nz-button nzType="primary">ng-zorro is wired</button>
  `,
})
export class AppComponent {
  protected readonly prefix = SardanapalNgInfo.SELECTOR_PREFIX;
}
