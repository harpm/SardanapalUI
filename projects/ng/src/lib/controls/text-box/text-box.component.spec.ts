import { Component } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { beforeEach, describe, expect, it } from 'vitest';
import { SardanapalTextBoxComponent } from '../../../public-api';
import { ControlTestKit } from '../test-kit';

@Component({
  imports: [SardanapalTextBoxComponent, ReactiveFormsModule],
  template: `<s-text-box [formControl]="control" placeholder="name" [maxLength]="5" readonly />`,
})
class ReactiveHostComponent {
  readonly control = new FormControl<string | null>('abc');
}

@Component({
  imports: [SardanapalTextBoxComponent, FormsModule],
  template: `<s-text-box [(ngModel)]="text" />`,
})
class ModelHostComponent {
  text: string | null = 'one';
}

class TextBoxTestKit {
  static input(fixture: { nativeElement: HTMLElement }): HTMLInputElement {
    return fixture.nativeElement.querySelector('input') as HTMLInputElement;
  }
}

describe('s-text-box', () => {
  beforeEach(() => ControlTestKit.installBrowserStubs());

  it('shows the form value and the input attributes', async () => {
    const fixture = await ControlTestKit.render(ReactiveHostComponent);
    const input = TextBoxTestKit.input(fixture);

    expect(input.value).toBe('abc');
    expect(input.placeholder).toBe('name');
    expect(input.getAttribute('maxlength')).toBe('5');
    expect(input.readOnly).toBe(true);
  });

  it('sends typing to the form control, marked dirty and touched on blur', async () => {
    const fixture = await ControlTestKit.render(ReactiveHostComponent);
    const control = fixture.componentInstance.control;
    const input = TextBoxTestKit.input(fixture);

    ControlTestKit.type(input, 'typed');
    expect(control.touched).toBe(false);
    input.dispatchEvent(new Event('blur'));

    expect(control.value).toBe('typed');
    expect(control.dirty).toBe(true);
    expect(control.touched).toBe(true);
  });

  it('gives an empty string when emptied', async () => {
    const fixture = await ControlTestKit.render(ReactiveHostComponent);

    ControlTestKit.type(TextBoxTestKit.input(fixture), '');

    expect(fixture.componentInstance.control.value).toBe('');
  });

  it('shows a value set from code', async () => {
    const fixture = await ControlTestKit.render(ReactiveHostComponent);

    fixture.componentInstance.control.setValue('from code');
    fixture.detectChanges();
    expect(TextBoxTestKit.input(fixture).value).toBe('from code');

    fixture.componentInstance.control.setValue(null);
    fixture.detectChanges();
    expect(TextBoxTestKit.input(fixture).value).toBe('');
  });

  it('disables the native input with the form control', async () => {
    const fixture = await ControlTestKit.render(ReactiveHostComponent);

    fixture.componentInstance.control.disable();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(TextBoxTestKit.input(fixture).disabled).toBe(true);
  });

  it('works with ngModel', async () => {
    const fixture = await ControlTestKit.render(ModelHostComponent);
    const input = TextBoxTestKit.input(fixture);

    expect(input.value).toBe('one');
    ControlTestKit.type(input, 'two');

    expect(fixture.componentInstance.text).toBe('two');
  });
});
