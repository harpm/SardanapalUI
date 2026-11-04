import { Component } from '@angular/core';
import { SardanapalTextComponent, SardanapalTextType } from '@harpm/sardanapal-ng';
import { DemoPageComponent } from './demo-page.component';

/** One sample row on the text page. */
class TextSample {
  constructor(
    readonly label: string,
    readonly value: unknown,
    readonly emptyText = '',
    readonly type?: SardanapalTextType,
  ) {}
}

/** Display-only text, including empty and typed variants. */
@Component({
  selector: 'app-text-page',
  imports: [DemoPageComponent, SardanapalTextComponent],
  template: `
    <app-demo-page
      selector="s-text"
      title="Text"
      lead="Display only. Null and undefined show emptyText. A Date uses the local format. type tints the text."
    >
      <ul class="samples">
        @for (sample of samples; track sample.label) {
          <li>
            <span>{{ sample.label }}</span>
            <s-text [value]="sample.value" [emptyText]="sample.emptyText" [type]="sample.type" />
          </li>
        }
      </ul>
    </app-demo-page>
  `,
  styles: `
    .samples {
      list-style: none;
      margin: 0;
      padding: 0;
      max-width: 480px;
    }

    .samples li {
      display: flex;
      gap: 16px;
      align-items: baseline;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
    }

    .samples span {
      width: 120px;
      color: rgba(0, 0, 0, 0.45);
    }
  `,
})
export class TextPageComponent {
  protected readonly samples: readonly TextSample[] = [
    new TextSample('Empty', null, '(empty)'),
    new TextSample('Plain', 'Ada Lovelace'),
    new TextSample('Secondary', 'Secondary', '', SardanapalTextType.Secondary),
    new TextSample('Warning', 'Warning', '', SardanapalTextType.Warning),
    new TextSample('Danger', 'Danger', '', SardanapalTextType.Danger),
    new TextSample('Success', 'Success', '', SardanapalTextType.Success),
    new TextSample('Date', new Date(2026, 0, 15, 9, 30)),
  ];
}
