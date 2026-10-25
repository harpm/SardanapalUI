import { Component, inject } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import {
  SARDANAPAL_DIRECTION_SERVICE,
  SardanapalNgLocaleService,
} from '@sardanapal/ng';

@Component({
  selector: 'app-root',
  imports: [NzButtonModule],
  template: `
    <h1>Sardanapal UI demo</h1>
    <p>Culture: {{ locale.culture() }}</p>
    <button nz-button nzType="primary" (click)="useEnglish()">English (ltr)</button>
    <button nz-button (click)="usePersian()">Persian (rtl)</button>
  `,
})
export class AppComponent {
  protected readonly locale = inject(SardanapalNgLocaleService);
  private readonly direction = inject(SARDANAPAL_DIRECTION_SERVICE);

  /** Language and direction are separate services, so the app sets both. */
  protected useEnglish(): void {
    this.locale.setCulture('en');
    this.direction.setDirection('ltr');
  }

  protected usePersian(): void {
    this.locale.setCulture('fa-IR');
    this.direction.setDirection('rtl');
  }
}
