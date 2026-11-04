import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SardanapalPasswordComponent } from '@harpm/sardanapal-ng';
import { DemoPageComponent } from './demo-page.component';

/** Secret text bound to a form control. */
@Component({
  selector: 'app-password-page',
  imports: [DemoPageComponent, ReactiveFormsModule, SardanapalPasswordComponent],
  template: `
    <app-demo-page
      selector="s-password"
      title="Password"
      lead="Secret text, with a visibility toggle. An emptied control gives an empty string."
    >
      <div class="demo-form">
        <s-password [formControl]="secret" placeholder="Password" />
      </div>
      <p class="demo-value">Length: {{ secret.value?.length ?? 0 }}</p>
    </app-demo-page>
  `,
})
export class PasswordPageComponent {
  protected readonly secret = new FormControl('');
}
