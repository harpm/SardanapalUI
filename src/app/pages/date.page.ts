import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SardanapalDateComponent } from '@harpm/sardanapal-ng';
import { DemoPageComponent } from './demo-page.component';

/** Date picker bound to a form control. */
@Component({
  selector: 'app-date-page',
  imports: [DemoPageComponent, ReactiveFormsModule, SardanapalDateComponent],
  template: `
    <app-demo-page
      selector="s-date"
      title="Date"
      lead="A Date, or null when empty. The panel marks the control touched when it closes."
    >
      <div class="demo-form">
        <s-date [formControl]="born" placeholder="Born" />
      </div>
      <p class="demo-value">Value: {{ bornText() }}</p>
    </app-demo-page>
  `,
})
export class DatePageComponent {
  protected readonly born = new FormControl<Date | null>(null);

  protected bornText(): string {
    const value = this.born.value;
    return value ? value.toLocaleDateString() : '(empty)';
  }
}
