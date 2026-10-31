import { Component, ElementRef, ViewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { SardanapalControlBase } from '../public-api';

@Component({
  selector: 's-test-box',
  template: `<input #box [value]="value() ?? ''" [disabled]="disabled()"
    (input)="updateValue(box.value)" (blur)="markTouched()">`,
})
class TestBoxComponent extends SardanapalControlBase<string> {
  @ViewChild('box') box!: ElementRef<HTMLInputElement>;
}

@Component({
  imports: [TestBoxComponent, ReactiveFormsModule],
  template: `<s-test-box [formControl]="control" />`,
})
class ReactiveHostComponent {
  readonly control = new FormControl<string | null>('start');
  @ViewChild(TestBoxComponent) box!: TestBoxComponent;
}

@Component({
  imports: [TestBoxComponent, FormsModule],
  template: `<s-test-box [(ngModel)]="text" [disabled]="off" />`,
})
class TemplateHostComponent {
  text: string | null = 'first';
  off = false;
  @ViewChild(TestBoxComponent) box!: TestBoxComponent;
}

class ControlTestKit {
  static type(component: TestBoxComponent, text: string): void {
    const input = component.box.nativeElement;
    input.value = text;
    input.dispatchEvent(new Event('input'));
  }
}

describe('SardanapalControlBase', () => {
  it('writes a reactive form value into the control', async () => {
    const fixture = TestBed.createComponent(ReactiveHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.box.value()).toBe('start');
    expect(fixture.componentInstance.box.box.nativeElement.value).toBe('start');

    fixture.componentInstance.control.setValue('later');
    fixture.detectChanges();

    expect(fixture.componentInstance.box.value()).toBe('later');
  });

  it('sends a typed value back to the reactive form and marks it touched', async () => {
    const fixture = TestBed.createComponent(ReactiveHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const host = fixture.componentInstance;

    ControlTestKit.type(host.box, 'typed');
    host.box.box.nativeElement.dispatchEvent(new Event('blur'));

    expect(host.control.value).toBe('typed');
    expect(host.control.touched).toBe(true);
    expect(host.control.dirty).toBe(true);
  });

  it('treats null and undefined writes as empty', async () => {
    const fixture = TestBed.createComponent(ReactiveHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.control.setValue(null);

    expect(fixture.componentInstance.box.value()).toBeNull();
  });

  it('follows the disabled state of the form control', async () => {
    const fixture = TestBed.createComponent(ReactiveHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const host = fixture.componentInstance;

    host.control.disable();
    fixture.detectChanges();
    expect(host.box.disabled()).toBe(true);
    expect(host.box.box.nativeElement.disabled).toBe(true);

    host.control.enable();
    fixture.detectChanges();
    expect(host.box.disabled()).toBe(false);
  });

  it('works with ngModel', async () => {
    const fixture = TestBed.createComponent(TemplateHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const host = fixture.componentInstance;

    expect(host.box.value()).toBe('first');

    ControlTestKit.type(host.box, 'second');
    expect(host.text).toBe('second');

    host.off = true;
    fixture.detectChanges();
    await fixture.whenStable();
    expect(host.box.disabled()).toBe(true);
  });

  it('works without a form, as a plain component', () => {
    @Component({ imports: [TestBoxComponent], template: `<s-test-box />` })
    class PlainHostComponent {
      @ViewChild(TestBoxComponent) box!: TestBoxComponent;
    }
    const fixture = TestBed.createComponent(PlainHostComponent);
    fixture.detectChanges();

    ControlTestKit.type(fixture.componentInstance.box, 'alone');

    expect(fixture.componentInstance.box.value()).toBe('alone');
  });
});
