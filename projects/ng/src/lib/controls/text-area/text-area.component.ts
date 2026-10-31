import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NzInputModule } from 'ng-zorro-antd/input';
import { SardanapalTextControlBase } from '../text-control-base';

/** Multi-line text. Works with `ngModel`, `formControl` and `formControlName`. */
@Component({
  selector: 's-text-area',
  imports: [NzInputModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [':host { display: block; }'],
  templateUrl: './text-area.component.html',
})
export class SardanapalTextAreaComponent extends SardanapalTextControlBase {
  @Input() rows = 3;
}
