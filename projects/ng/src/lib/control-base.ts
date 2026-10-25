import { Directive, inject, signal } from '@angular/core';
import { NgControl, type ControlValueAccessor } from '@angular/forms';

/**
 * Base of every editing control (`s-text-box`, `s-numeric`, ...). It implements
 * `ControlValueAccessor` once, so `ngModel`, `formControl` and `formControlName`
 * all work. The control registers itself with its own `NgControl`, so a subclass
 * needs no `NG_VALUE_ACCESSOR` provider.
 *
 * A subclass reads `value()` and `disabled()` in its template, calls
 * `updateValue` when the user changes the value, and `markTouched` on blur.
 */
@Directive()
export abstract class SardanapalControlBase<T> implements ControlValueAccessor {
  /** The value written by the form, or typed by the user. `null` when empty. */
  readonly value = signal<T | null>(null);
  readonly disabled = signal(false);

  private onChange: (value: T | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  protected constructor() {
    const ngControl = inject(NgControl, { self: true, optional: true });
    if (ngControl) {
      ngControl.valueAccessor = this;
    }
  }

  writeValue(value: T | null): void {
    this.value.set(value ?? null);
  }

  registerOnChange(fn: (value: T | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  /** Stores a value the user entered and tells the form. */
  protected updateValue(value: T | null): void {
    this.value.set(value);
    this.onChange(value);
  }

  protected markTouched(): void {
    this.onTouched();
  }
}
