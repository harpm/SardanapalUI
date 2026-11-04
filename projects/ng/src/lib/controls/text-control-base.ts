import { booleanAttribute, Directive, Input } from '@angular/core';
import { SardanapalControlBase } from '../control-base';
import { SardanapalControlSize, SardanapalControlStatus } from '../types/types';

/**
 * Shared inputs of the text controls (`s-text-box`, `s-text-area`, `s-password`). An emptied
 * control gives `''`, as a native input does, so `Validators.required` works.
 */
@Directive()
export abstract class SardanapalTextControlBase extends SardanapalControlBase<string> {
  @Input() placeholder = '';
  @Input({ transform: booleanAttribute }) readonly = false;
  @Input() maxLength: number | null = null;
  @Input() size = SardanapalControlSize.Default;
  @Input() status = SardanapalControlStatus.None;
}
