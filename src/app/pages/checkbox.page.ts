import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SardanapalCheckboxComponent } from '@harpm/sardanapal-ng';
import { DemoPageComponent } from './demo-page.component';

/** Boolean checkbox bound to a form control. */
@Component({
  selector: 'app-checkbox-page',
  imports: [DemoPageComponent, ReactiveFormsModule, SardanapalCheckboxComponent],
  template: `
    <app-demo-page
      selector="s-checkbox"
      title="Checkbox"
      lead="True or false. Null from the form shows as unchecked."
    >
      <div class="demo-form">
        <s-checkbox [formControl]="agree" label="I agree" />
      </div>
      <p class="demo-value">Value: {{ agree.value }}</p>
    </app-demo-page>
  `,
})
export class CheckboxPageComponent {
  protected readonly agree = new FormControl(false);
}
