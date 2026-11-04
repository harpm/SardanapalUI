import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SardanapalNumericComponent } from '@harpm/sardanapal-ng';
import { DemoPageComponent } from './demo-page.component';

/** Number input bound to a form control. */
@Component({
  selector: 'app-numeric-page',
  imports: [DemoPageComponent, ReactiveFormsModule, SardanapalNumericComponent],
  template: `
    <app-demo-page
      selector="s-numeric"
      title="Numeric"
      lead="A number. An emptied control gives null. min and max limit the value."
    >
      <div class="demo-form">
        <s-numeric [formControl]="age" [min]="0" [max]="120" placeholder="Age" />
      </div>
      <p class="demo-value">Value: {{ ageText() }}</p>
    </app-demo-page>
  `,
})
export class NumericPageComponent {
  protected readonly age = new FormControl<number | null>(null);

  protected ageText(): string {
    return this.age.value === null || this.age.value === undefined ? '(empty)' : String(this.age.value);
  }
}
