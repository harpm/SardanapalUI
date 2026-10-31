import {
  ChangeDetectionStrategy,
  Component,
  computed,
  Input,
  signal,
  type OnChanges,
  type SimpleChanges,
} from '@angular/core';
import { NzTypographyModule } from 'ng-zorro-antd/typography';

/** Display-only text. `null` and `undefined` show `emptyText`. */
@Component({
  selector: 's-text',
  imports: [NzTypographyModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [':host { display: inline; }'],
  templateUrl: './text.component.html',
})
export class SardanapalTextComponent implements OnChanges {
  @Input() value: unknown = null;
  /** Shown when `value` is `null` or `undefined`. */
  @Input() emptyText = '';
  @Input() type: 'secondary' | 'warning' | 'danger' | 'success' | undefined = undefined;

  private readonly currentValue = signal<unknown>(null);
  private readonly currentEmptyText = signal('');

  protected readonly text = computed(() => {
    const value = this.currentValue();
    if (value === null || value === undefined) {
      return this.currentEmptyText();
    }
    return value instanceof Date ? value.toLocaleString() : String(value);
  });

  ngOnChanges(changes: SimpleChanges): void {
    if ('value' in changes) {
      this.currentValue.set(this.value);
    }
    if ('emptyText' in changes) {
      this.currentEmptyText.set(this.emptyText);
    }
  }
}
