import { Component } from '@angular/core';
import { type ComponentFixture } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { beforeEach, describe, expect, it } from 'vitest';
import { SardanapalCheckboxComponent } from '../../../public-api';
import { ControlTestKit } from '../test-kit';

@Component({
  imports: [SardanapalCheckboxComponent, ReactiveFormsModule],
  template: `<s-checkbox [formControl]="control" label="Agree" />`,
})
class ReactiveHostComponent {
  readonly control = new FormControl<boolean | null>(false);
}

@Component({
  imports: [SardanapalCheckboxComponent, FormsModule],
  template: `<s-checkbox [(ngModel)]="on" />`,
})
class ModelHostComponent {
  on: boolean | null = true;
}

class CheckboxTestKit {
  static async refresh(fixture: ComponentFixture<unknown>): Promise<void> {
    for (let pass = 0; pass < 3; pass++) {
      fixture.detectChanges();
      await fixture.whenStable();
    }
  }

  static box(fixture: { nativeElement: HTMLElement }): HTMLInputElement {
    return fixture.nativeElement.querySelector('input[type="checkbox"]') as HTMLInputElement;
  }
}

describe('s-checkbox', () => {
  beforeEach(() => ControlTestKit.installBrowserStubs());

  it('shows the form value and the label', async () => {
    const fixture = await ControlTestKit.render(ReactiveHostComponent);

    expect(CheckboxTestKit.box(fixture).checked).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Agree');
  });

  it('sends a click to the form control and marks it touched', async () => {
    const fixture = await ControlTestKit.render(ReactiveHostComponent);
    const box = CheckboxTestKit.box(fixture);

    box.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.control.value).toBe(true);
    expect(fixture.componentInstance.control.dirty).toBe(true);
    expect(fixture.componentInstance.control.touched).toBe(true);
  });

  it('shows unchecked when the form writes null', async () => {
    const fixture = await ControlTestKit.render(ReactiveHostComponent);

    fixture.componentInstance.control.setValue(null);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(CheckboxTestKit.box(fixture).checked).toBe(false);
  });

  it('shows a value set from code', async () => {
    const fixture = await ControlTestKit.render(ReactiveHostComponent);

    fixture.componentInstance.control.setValue(true);
    await CheckboxTestKit.refresh(fixture);

    expect(CheckboxTestKit.box(fixture).checked).toBe(true);
  });

  it('disables the box with the form control', async () => {
    const fixture = await ControlTestKit.render(ReactiveHostComponent);

    fixture.componentInstance.control.disable();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(CheckboxTestKit.box(fixture).disabled).toBe(true);
  });

  it('works with ngModel', async () => {
    const fixture = await ControlTestKit.render(ModelHostComponent);
    await CheckboxTestKit.refresh(fixture);

    expect(CheckboxTestKit.box(fixture).checked).toBe(true);
    CheckboxTestKit.box(fixture).click();
    await CheckboxTestKit.refresh(fixture);

    expect(fixture.componentInstance.on).toBe(false);
  });
});
