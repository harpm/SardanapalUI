import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { NzDatePickerComponent } from 'ng-zorro-antd/date-picker';
import { provideNzNativeDateAdapter } from 'ng-zorro-antd/core/time';
import { beforeEach, describe, expect, it } from 'vitest';
import { SardanapalDateComponent } from '../../../public-api';
import { ControlTestKit } from '../test-kit';

@Component({
  imports: [SardanapalDateComponent, ReactiveFormsModule],
  template: `<s-date [formControl]="control" placeholder="when" format="yyyy/MM/dd" />`,
})
class ReactiveHostComponent {
  readonly control = new FormControl<Date | null>(new Date(2026, 0, 2));
}

@Component({
  imports: [SardanapalDateComponent, FormsModule],
  template: `<s-date [(ngModel)]="when" />`,
})
class ModelHostComponent {
  when: Date | null = new Date(2026, 5, 1);
}

class DateTestKit {
  static async refresh(fixture: ComponentFixture<unknown>): Promise<void> {
    for (let pass = 0; pass < 3; pass++) {
      fixture.detectChanges();
      await fixture.whenStable();
    }
  }

  static picker(fixture: ComponentFixture<unknown>) {
    return fixture.debugElement.query(By.directive(NzDatePickerComponent));
  }
}

describe('s-date', () => {
  beforeEach(() => {
    ControlTestKit.installBrowserStubs();
    TestBed.configureTestingModule({ providers: [provideNzNativeDateAdapter()] });
  });

  it('shows the form value and the placeholder', async () => {
    const fixture = await ControlTestKit.render(ReactiveHostComponent);
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    expect(input.value).toBe('2026/01/02');
    expect(input.placeholder).toBe('when');
  });

  it('sends a chosen date to the form control and marks it touched when the panel closes', async () => {
    const fixture = await ControlTestKit.render(ReactiveHostComponent);
    const next = new Date(2026, 2, 15);
    const picker = DateTestKit.picker(fixture);

    picker.triggerEventHandler('ngModelChange', next);
    picker.triggerEventHandler('nzOnOpenChange', false);

    expect(fixture.componentInstance.control.value).toEqual(next);
    expect(fixture.componentInstance.control.dirty).toBe(true);
    expect(fixture.componentInstance.control.touched).toBe(true);
  });

  it('gives null when cleared', async () => {
    const fixture = await ControlTestKit.render(ReactiveHostComponent);

    DateTestKit.picker(fixture).triggerEventHandler('ngModelChange', null);

    expect(fixture.componentInstance.control.value).toBeNull();
  });

  it('shows a value set from code', async () => {
    const fixture = await ControlTestKit.render(ReactiveHostComponent);
    const later = new Date(2026, 11, 25);

    fixture.componentInstance.control.setValue(later);
    await DateTestKit.refresh(fixture);

    expect((fixture.nativeElement.querySelector('input') as HTMLInputElement).value).toBe('2026/12/25');
  });

  it('disables the picker with the form control', async () => {
    const fixture = await ControlTestKit.render(ReactiveHostComponent);

    fixture.componentInstance.control.disable();
    await DateTestKit.refresh(fixture);

    expect((fixture.nativeElement.querySelector('input') as HTMLInputElement).disabled).toBe(true);
  });

  it('works with ngModel', async () => {
    const fixture = await ControlTestKit.render(ModelHostComponent);
    const next = new Date(2026, 8, 9);

    DateTestKit.picker(fixture).triggerEventHandler('ngModelChange', next);

    expect(fixture.componentInstance.when).toEqual(next);
  });
});
