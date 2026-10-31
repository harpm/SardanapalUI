import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NzInputModule } from 'ng-zorro-antd/input';
import { SardanapalTextControlBase } from '../text-control-base';

/** Single-line text. Works with `ngModel`, `formControl` and `formControlName`. */
@Component({
  selector: 's-text-box',
  imports: [NzInputModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [':host { display: block; }'],
  templateUrl: './text-box.component.html',
})
export class SardanapalTextBoxComponent extends SardanapalTextControlBase {}
