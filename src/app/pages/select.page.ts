import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import type { SelectOption } from '@harpm/sardanapal-client';
import { SardanapalSelectComponent } from '@harpm/sardanapal-ng';
import { DemoPageComponent } from './demo-page.component';

/** Static options bound to a form control. The value is the option key. */
@Component({
  selector: 'app-select-page',
  imports: [DemoPageComponent, ReactiveFormsModule, SardanapalSelectComponent],
  template: `
    <app-demo-page
      selector="s-select"
      title="Select"
      lead="The value is a key. These options are static. A panel client can be passed as dictionary instead, and the typed filter goes out as dynamicField."
    >
      <div class="demo-form">
        <s-select [formControl]="role" [options]="roles" placeholder="Role" />
      </div>
      <p class="demo-value">Value: {{ roleText() }}</p>
    </app-demo-page>
  `,
})
export class SelectPageComponent {
  protected readonly role = new FormControl<number | null>(null);
  protected readonly roles: SelectOption<number, string>[] = [
    { key: 1, value: 'Admin' },
    { key: 2, value: 'Editor' },
    { key: 3, value: 'Viewer' },
  ];

  protected roleText(): string {
    const key = this.role.value;
    for (const option of this.roles) {
      if (option.key === key) {
        return option.value;
      }
    }
    return '(empty)';
  }
}
