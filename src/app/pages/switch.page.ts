import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SardanapalSwitchComponent } from '@harpm/sardanapal-ng';
import { DemoPageComponent } from './demo-page.component';

/** Boolean switch bound to a form control. */
@Component({
  selector: 'app-switch-page',
  imports: [DemoPageComponent, ReactiveFormsModule, SardanapalSwitchComponent],
  template: `
    <app-demo-page
      selector="s-switch"
      title="Switch"
      lead="True or false. Null from the form shows as off."
    >
      <div class="demo-form">
        <s-switch [formControl]="active" checkedText="On" uncheckedText="Off" />
      </div>
      <p class="demo-value">Value: {{ active.value }}</p>
    </app-demo-page>
  `,
})
export class SwitchPageComponent {
  protected readonly active = new FormControl(true);
}
