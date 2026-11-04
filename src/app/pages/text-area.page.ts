import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SardanapalTextAreaComponent } from '@harpm/sardanapal-ng';
import { DemoPageComponent } from './demo-page.component';

/** Multi-line text bound to a form control. */
@Component({
  selector: 'app-text-area-page',
  imports: [DemoPageComponent, ReactiveFormsModule, SardanapalTextAreaComponent],
  template: `
    <app-demo-page
      selector="s-text-area"
      title="Text area"
      lead="Multi-line text. An emptied control gives an empty string, the same as a native textarea."
    >
      <div class="demo-form">
        <s-text-area [formControl]="notes" [rows]="4" placeholder="Notes" />
      </div>
      <p class="demo-value">Value: {{ notesText() }}</p>
    </app-demo-page>
  `,
})
export class TextAreaPageComponent {
  protected readonly notes = new FormControl('');

  protected notesText(): string {
    return this.notes.value ? this.notes.value : '(empty)';
  }
}
