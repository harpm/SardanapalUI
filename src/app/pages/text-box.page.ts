import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SardanapalTextBoxComponent } from '@harpm/sardanapal-ng';
import { DemoPageComponent } from './demo-page.component';

/** Single-line text bound to a form control. */
@Component({
  selector: 'app-text-box-page',
  imports: [DemoPageComponent, ReactiveFormsModule, SardanapalTextBoxComponent],
  template: `
    <app-demo-page
      selector="s-text-box"
      title="Text box"
      lead="Single-line text. An emptied control gives an empty string, so Validators.required works."
    >
      <div class="demo-form">
        <s-text-box [formControl]="name" placeholder="Name" />
      </div>
      <p class="demo-value">Value: {{ nameText() }}</p>
    </app-demo-page>
  `,
})
export class TextBoxPageComponent {
  protected readonly name = new FormControl('');

  protected nameText(): string {
    return this.name.value ? this.name.value : '(empty)';
  }
}
