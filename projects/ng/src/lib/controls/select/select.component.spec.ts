import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import type { SelectOption } from '@sardanapal/client';
import { NzOptionComponent, NzSelectComponent } from 'ng-zorro-antd/select';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SardanapalSelectComponent, type SardanapalDictionarySource } from '../../../public-api';
import { ControlTestKit } from '../test-kit';

type DictionaryCall = { fields: Record<string, unknown> | null; dynamicField: string; pageSize: number };

@Component({
  imports: [SardanapalSelectComponent, ReactiveFormsModule],
  template: `
    <s-select
      [formControl]="control"
      [options]="options"
      [dictionary]="dictionary()"
      [dictionaryFields]="fields()"
      [multiple]="multiple"
    />
  `,
})
class SelectHostComponent {
  readonly control = new FormControl<number | number[] | null>(null);
  options: SelectOption<number>[] = [
    { key: 1, value: 'One' },
    { key: 2, value: 'Two' },
  ];
  multiple = false;
  readonly dictionary = signal<SardanapalDictionarySource | null>(null);
  readonly fields = signal<Record<string, unknown> | null>(null);
}

class SelectTestKit {
  static readonly cities: SelectOption<number>[] = [
    { key: 10, value: 'Tehran' },
    { key: 11, value: 'Shiraz' },
  ];

  static dictionary(
    respond: (call: DictionaryCall) => ReturnType<SardanapalDictionarySource['$getDictionary']>,
  ) {
    return { $getDictionary: vi.fn((call: DictionaryCall) => respond(call)) };
  }

  static answering(list: SelectOption<number>[]) {
    return SelectTestKit.dictionary(() => of(ControlTestKit.page(list)) as never);
  }

  static async render(): Promise<ComponentFixture<SelectHostComponent>> {
    const fixture = TestBed.createComponent(SelectHostComponent);
    await SelectTestKit.settle(fixture);
    return fixture;
  }

  static async settle(fixture: ComponentFixture<unknown>): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  static labels(fixture: ComponentFixture<unknown>): string[] {
    const select: NzSelectComponent = SelectTestKit.select(fixture).componentInstance;
    return select.listOfNzOptionComponent.map((option: NzOptionComponent) => String(option.nzLabel));
  }

  static select(fixture: ComponentFixture<unknown>) {
    return fixture.debugElement.query(By.directive(NzSelectComponent));
  }
}

describe('s-select', () => {
  beforeEach(() => ControlTestKit.installBrowserStubs());
  afterEach(() => vi.useRealTimers());

  it('lists the static options by their value', async () => {
    const fixture = await SelectTestKit.render();

    expect(SelectTestKit.labels(fixture)).toEqual(['One', 'Two']);
  });

  it('sends the chosen key to the form control and marks it touched', async () => {
    const fixture = await SelectTestKit.render();
    const select = SelectTestKit.select(fixture);

    select.triggerEventHandler('ngModelChange', 2);
    select.triggerEventHandler('nzBlur', undefined);

    expect(fixture.componentInstance.control.value).toBe(2);
    expect(fixture.componentInstance.control.dirty).toBe(true);
    expect(fixture.componentInstance.control.touched).toBe(true);
  });

  it('sends an array of keys with multiple', async () => {
    const fixture = TestBed.createComponent(SelectHostComponent);
    fixture.componentInstance.multiple = true;
    await SelectTestKit.settle(fixture);

    SelectTestKit.select(fixture).triggerEventHandler('ngModelChange', [1, 2]);

    expect(fixture.componentInstance.control.value).toEqual([1, 2]);
    expect(SelectTestKit.select(fixture).componentInstance.nzMode).toBe('multiple');
  });

  it('shows a value set from code in the select', async () => {
    const fixture = await SelectTestKit.render();

    fixture.componentInstance.control.setValue(1);
    await SelectTestKit.settle(fixture);

    expect(fixture.nativeElement.querySelector('.ant-select-selection-item')?.textContent).toBe('One');
  });

  it('loads the dictionary once and ignores the static options', async () => {
    const dictionary = SelectTestKit.answering(SelectTestKit.cities);
    const fixture = TestBed.createComponent(SelectHostComponent);
    fixture.componentInstance.dictionary.set(dictionary as never);
    fixture.componentInstance.fields.set({ province: 'Fars' });
    await SelectTestKit.settle(fixture);

    expect(dictionary.$getDictionary).toHaveBeenCalledTimes(1);
    expect(dictionary.$getDictionary).toHaveBeenCalledWith({
      fields: { province: 'Fars' },
      dynamicField: '',
      pageSize: 25,
    });
    expect(SelectTestKit.labels(fixture)).toEqual(['Tehran', 'Shiraz']);
  });

  it('loads again when the dictionary fields change', async () => {
    const dictionary = SelectTestKit.answering(SelectTestKit.cities);
    const fixture = TestBed.createComponent(SelectHostComponent);
    fixture.componentInstance.dictionary.set(dictionary as never);
    await SelectTestKit.settle(fixture);

    fixture.componentInstance.fields.set({ province: 'Tehran' });
    await SelectTestKit.settle(fixture);

    expect(dictionary.$getDictionary).toHaveBeenCalledTimes(2);
    expect(dictionary.$getDictionary).toHaveBeenLastCalledWith({
      fields: { province: 'Tehran' },
      dynamicField: '',
      pageSize: 25,
    });
  });

  it('searches on the host after a pause, sending only the last text as dynamicField', async () => {
    const dictionary = SelectTestKit.answering(SelectTestKit.cities);
    const fixture = TestBed.createComponent(SelectHostComponent);
    fixture.componentInstance.dictionary.set(dictionary as never);
    fixture.componentInstance.fields.set({ province: 'Fars' });
    await SelectTestKit.settle(fixture);
    expect(dictionary.$getDictionary).toHaveBeenLastCalledWith({
      fields: { province: 'Fars' },
      dynamicField: '',
      pageSize: 25,
    });

    const select = SelectTestKit.select(fixture);
    vi.useFakeTimers();
    select.triggerEventHandler('nzOnSearch', 'sh');
    vi.advanceTimersByTime(100);
    select.triggerEventHandler('nzOnSearch', ' shi ');
    vi.advanceTimersByTime(300);

    expect(dictionary.$getDictionary).toHaveBeenCalledTimes(2);
    expect(dictionary.$getDictionary).toHaveBeenLastCalledWith({
      fields: { province: 'Fars' },
      dynamicField: 'shi',
      pageSize: 25,
    });
  });

  it('does not call the host when the user types over static options', async () => {
    const dictionary = SelectTestKit.answering(SelectTestKit.cities);
    const fixture = await SelectTestKit.render();
    vi.useFakeTimers();

    SelectTestKit.select(fixture).triggerEventHandler('nzOnSearch', 'teh');
    vi.advanceTimersByTime(1000);

    expect(dictionary.$getDictionary).not.toHaveBeenCalled();
  });

  it('leaves the list empty for a failure envelope', async () => {
    const dictionary = SelectTestKit.dictionary(() => of(ControlTestKit.failed('no')) as never);
    const fixture = TestBed.createComponent(SelectHostComponent);
    fixture.componentInstance.dictionary.set(dictionary as never);
    await SelectTestKit.settle(fixture);

    expect(SelectTestKit.labels(fixture)).toEqual([]);
  });

  it('leaves the list empty when the request fails, and loads again later', async () => {
    let fail = true;
    const dictionary = SelectTestKit.dictionary(() =>
      fail ? throwError(() => new Error('down')) : (of(ControlTestKit.page(SelectTestKit.cities)) as never),
    );
    const fixture = TestBed.createComponent(SelectHostComponent);
    fixture.componentInstance.dictionary.set(dictionary as never);
    await SelectTestKit.settle(fixture);
    expect(SelectTestKit.labels(fixture)).toEqual([]);

    fail = false;
    fixture.componentInstance.fields.set({ retry: true });
    await SelectTestKit.settle(fixture);

    expect(SelectTestKit.labels(fixture)).toEqual(['Tehran', 'Shiraz']);
  });
});
