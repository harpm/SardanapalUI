import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { beforeEach, describe, expect, it } from 'vitest';
import { SardanapalNumericComponent } from '../../../public-api';
import { ControlTestKit } from '../test-kit';

@Component({
  imports: [SardanapalNumericComponent, ReactiveFormsModule],
  template: `<s-numeric [formControl]="control" [min]="0" [max]="10" [precision]="1" placeholder="qty" />`,
})
class ReactiveHostComponent {
  readonly control = new FormControl<number | null>(3);
}

@Component({
  imports: [SardanapalNumericComponent, FormsModule],
  template: `<s-numeric [(ngModel)]="amount" />`,
})
class ModelHostComponent {
  amount: number | null = 7;
}

class NumericTestKit {
  static async render<T>(type: new () => T) {
    const fixture = TestBed.createComponent(type);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  /** `ngModel` inside the control passes a change on after a promise, so one pass is not enough. */
  static async refresh(fixture: ComponentFixture<unknown>): Promise<void> {
    for (let pass = 0; pass < 3; pass++) {
      fixture.detectChanges();
      await fixture.whenStable();
    }
  }

  static input(fixture: { nativeElement: HTMLElement }): HTMLInputElement {
    return fixture.nativeElement.querySelector('input') as HTMLInputElement;
  }

  static async type(
    fixture: { detectChanges(): void; whenStable(): Promise<unknown>; nativeElement: HTMLElement },
    text: string,
  ): Promise<void> {
    const input = NumericTestKit.input(fixture);
    input.value = text;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    await fixture.whenStable();
  }
}

describe('s-numeric', () => {
  beforeEach(() => ControlTestKit.installBrowserStubs());

  it('shows the form value and the placeholder', async () => {
    const fixture = await NumericTestKit.render(ReactiveHostComponent);

    expect(NumericTestKit.input(fixture).value).toBe('3.0');
    expect(NumericTestKit.input(fixture).placeholder).toBe('qty');
  });

  it('sends a typed number to the form control and marks it touched', async () => {
    const fixture = await NumericTestKit.render(ReactiveHostComponent);

    await NumericTestKit.type(fixture, '4.5');

    expect(fixture.componentInstance.control.value).toBe(4.5);
    expect(fixture.componentInstance.control.dirty).toBe(true);
    expect(fixture.componentInstance.control.touched).toBe(true);
  });

  it('keeps the number inside min and max', async () => {
    const fixture = await NumericTestKit.render(ReactiveHostComponent);

    await NumericTestKit.type(fixture, '99');

    expect(fixture.componentInstance.control.value).toBe(10);
  });

  it('gives null when emptied', async () => {
    const fixture = await NumericTestKit.render(ReactiveHostComponent);

    await NumericTestKit.type(fixture, '');

    expect(fixture.componentInstance.control.value).toBeNull();
  });

  it('shows a value set from code', async () => {
    const fixture = await NumericTestKit.render(ReactiveHostComponent);

    fixture.componentInstance.control.setValue(8);
    await NumericTestKit.refresh(fixture);

    expect(NumericTestKit.input(fixture).value).toBe('8.0');
  });

  it('disables the input with the form control', async () => {
    const fixture = await NumericTestKit.render(ReactiveHostComponent);

    fixture.componentInstance.control.disable();
    await NumericTestKit.refresh(fixture);

    expect(NumericTestKit.input(fixture).disabled).toBe(true);
  });

  it('works with ngModel', async () => {
    const fixture = await NumericTestKit.render(ModelHostComponent);

    expect(NumericTestKit.input(fixture).value).toBe('7');
    await NumericTestKit.type(fixture, '12');

    expect(fixture.componentInstance.amount).toBe(12);
  });
});
