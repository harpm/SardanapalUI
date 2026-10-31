import { Component } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { beforeEach, describe, expect, it } from 'vitest';
import { SardanapalTextAreaComponent } from '../../../public-api';
import { ControlTestKit } from '../test-kit';

@Component({
  imports: [SardanapalTextAreaComponent, ReactiveFormsModule],
  template: `<s-text-area [formControl]="control" [rows]="6" placeholder="notes" />`,
})
class ReactiveHostComponent {
  readonly control = new FormControl<string | null>('line');
}

@Component({
  imports: [SardanapalTextAreaComponent, FormsModule],
  template: `<s-text-area [(ngModel)]="text" />`,
})
class ModelHostComponent {
  text: string | null = 'one';
}

class TextAreaTestKit {
  static area(fixture: { nativeElement: HTMLElement }): HTMLTextAreaElement {
    return fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
  }
}

describe('s-text-area', () => {
  beforeEach(() => ControlTestKit.installBrowserStubs());

  it('shows the form value, the rows and the placeholder', async () => {
    const fixture = await ControlTestKit.render(ReactiveHostComponent);
    const area = TextAreaTestKit.area(fixture);

    expect(area.value).toBe('line');
    expect(area.rows).toBe(6);
    expect(area.placeholder).toBe('notes');
  });

  it('sends multi-line typing to the form control, touched on blur', async () => {
    const fixture = await ControlTestKit.render(ReactiveHostComponent);
    const control = fixture.componentInstance.control;
    const area = TextAreaTestKit.area(fixture);

    ControlTestKit.type(area, 'many\nlines');
    expect(control.touched).toBe(false);
    area.dispatchEvent(new Event('blur'));

    expect(control.value).toBe('many\nlines');
    expect(control.dirty).toBe(true);
    expect(control.touched).toBe(true);
  });

  it('shows a value set from code', async () => {
    const fixture = await ControlTestKit.render(ReactiveHostComponent);

    fixture.componentInstance.control.setValue(null);
    fixture.detectChanges();

    expect(TextAreaTestKit.area(fixture).value).toBe('');
  });

  it('works with ngModel', async () => {
    const fixture = await ControlTestKit.render(ModelHostComponent);
    const area = TextAreaTestKit.area(fixture);

    expect(area.value).toBe('one');
    ControlTestKit.type(area, 'two');

    expect(fixture.componentInstance.text).toBe('two');
  });
});
