import { Component } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { beforeEach, describe, expect, it } from 'vitest';
import { SardanapalPasswordComponent } from '../../../public-api';
import { ControlTestKit } from '../test-kit';

@Component({
  imports: [SardanapalPasswordComponent, ReactiveFormsModule],
  template: `<s-password [formControl]="control" placeholder="secret" [maxLength]="8" />`,
})
class ReactiveHostComponent {
  readonly control = new FormControl<string | null>('abc');
}

@Component({
  imports: [SardanapalPasswordComponent, FormsModule],
  template: `<s-password [(ngModel)]="text" />`,
})
class ModelHostComponent {
  text: string | null = 'one';
}

class PasswordTestKit {
  static input(fixture: { nativeElement: HTMLElement }): HTMLInputElement {
    return fixture.nativeElement.querySelector('input') as HTMLInputElement;
  }
}

describe('s-password', () => {
  beforeEach(() => ControlTestKit.installBrowserStubs());

  it('shows the form value and the input attributes', async () => {
    const fixture = await ControlTestKit.render(ReactiveHostComponent);
    const input = PasswordTestKit.input(fixture);

    expect(input.value).toBe('abc');
    expect(input.placeholder).toBe('secret');
    expect(input.getAttribute('maxlength')).toBe('8');
    expect(input.type).toBe('password');
  });

  it('sends typing to the form control, marked dirty and touched on blur', async () => {
    const fixture = await ControlTestKit.render(ReactiveHostComponent);
    const control = fixture.componentInstance.control;
    const input = PasswordTestKit.input(fixture);

    ControlTestKit.type(input, 'typed');
    expect(control.touched).toBe(false);
    input.dispatchEvent(new Event('blur'));

    expect(control.value).toBe('typed');
    expect(control.dirty).toBe(true);
    expect(control.touched).toBe(true);
  });

  it('gives an empty string when emptied', async () => {
    const fixture = await ControlTestKit.render(ReactiveHostComponent);

    ControlTestKit.type(PasswordTestKit.input(fixture), '');

    expect(fixture.componentInstance.control.value).toBe('');
  });

  it('shows a value set from code', async () => {
    const fixture = await ControlTestKit.render(ReactiveHostComponent);

    fixture.componentInstance.control.setValue('from code');
    fixture.detectChanges();
    expect(PasswordTestKit.input(fixture).value).toBe('from code');
  });

  it('disables the native input with the form control', async () => {
    const fixture = await ControlTestKit.render(ReactiveHostComponent);

    fixture.componentInstance.control.disable();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(PasswordTestKit.input(fixture).disabled).toBe(true);
  });

  it('works with ngModel', async () => {
    const fixture = await ControlTestKit.render(ModelHostComponent);
    const input = PasswordTestKit.input(fixture);

    expect(input.value).toBe('one');
    ControlTestKit.type(input, 'two');

    expect(fixture.componentInstance.text).toBe('two');
  });
});
