import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { NzSwitchComponent } from 'ng-zorro-antd/switch';
import { beforeEach, describe, expect, it } from 'vitest';
import { SardanapalSwitchComponent } from '../../../public-api';
import { ControlTestKit } from '../test-kit';

@Component({
  imports: [SardanapalSwitchComponent, ReactiveFormsModule],
  template: `<s-switch [formControl]="control" checkedText="On" uncheckedText="Off" />`,
})
class ReactiveHostComponent {
  readonly control = new FormControl<boolean | null>(false);
}

@Component({
  imports: [SardanapalSwitchComponent, FormsModule],
  template: `<s-switch [(ngModel)]="on" />`,
})
class ModelHostComponent {
  on: boolean | null = true;
}

class SwitchTestKit {
  static async refresh(fixture: ComponentFixture<unknown>): Promise<void> {
    for (let pass = 0; pass < 3; pass++) {
      fixture.detectChanges();
      await fixture.whenStable();
    }
  }

  static switch(fixture: ComponentFixture<unknown>) {
    return fixture.debugElement.query(By.directive(NzSwitchComponent));
  }

  static button(fixture: { nativeElement: HTMLElement }): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button') as HTMLButtonElement;
  }
}

describe('s-switch', () => {
  beforeEach(() => ControlTestKit.installBrowserStubs());

  it('shows the form value and the on and off text', async () => {
    const fixture = await ControlTestKit.render(ReactiveHostComponent);

    expect(SwitchTestKit.button(fixture).classList.contains('ant-switch-checked')).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Off');
  });

  it('sends a flip to the form control and marks it touched', async () => {
    const fixture = await ControlTestKit.render(ReactiveHostComponent);

    SwitchTestKit.switch(fixture).triggerEventHandler('ngModelChange', true);
    await SwitchTestKit.refresh(fixture);

    expect(fixture.componentInstance.control.value).toBe(true);
    expect(fixture.componentInstance.control.dirty).toBe(true);
    expect(fixture.componentInstance.control.touched).toBe(true);
  });

  it('shows off when the form writes null', async () => {
    const fixture = await ControlTestKit.render(ReactiveHostComponent);

    fixture.componentInstance.control.setValue(null);
    await SwitchTestKit.refresh(fixture);

    expect(SwitchTestKit.button(fixture).classList.contains('ant-switch-checked')).toBe(false);
  });

  it('shows a value set from code', async () => {
    const fixture = await ControlTestKit.render(ReactiveHostComponent);

    fixture.componentInstance.control.setValue(true);
    await SwitchTestKit.refresh(fixture);

    expect(SwitchTestKit.button(fixture).classList.contains('ant-switch-checked')).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('On');
  });

  it('disables the switch with the form control', async () => {
    const fixture = await ControlTestKit.render(ReactiveHostComponent);

    fixture.componentInstance.control.disable();
    await SwitchTestKit.refresh(fixture);

    expect(SwitchTestKit.button(fixture).disabled).toBe(true);
  });

  it('works with ngModel', async () => {
    const fixture = await ControlTestKit.render(ModelHostComponent);
    await SwitchTestKit.refresh(fixture);

    expect(SwitchTestKit.button(fixture).classList.contains('ant-switch-checked')).toBe(true);
    SwitchTestKit.switch(fixture).triggerEventHandler('ngModelChange', false);
    await SwitchTestKit.refresh(fixture);

    expect(fixture.componentInstance.on).toBe(false);
  });
});
