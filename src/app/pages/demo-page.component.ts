import { Component, Input } from '@angular/core';

/** Shared heading for a demo page. The page body is projected. */
@Component({
  selector: 'app-demo-page',
  host: { class: 'demo-card' },
  template: `
    @if (selector) {
      <p class="kicker">{{ selector }}</p>
    }
    <h1>{{ title }}</h1>
    <p class="lead">{{ lead }}</p>
    <ng-content />
  `,
  styles: `
    .kicker {
      margin: 0 0 4px;
      color: #1677ff;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 13px;
    }

    h1 {
      margin: 0 0 8px;
      font-size: 24px;
      font-weight: 600;
    }

    .lead {
      margin: 0 0 24px;
      max-width: 68ch;
      color: rgba(0, 0, 0, 0.65);
    }
  `,
})
export class DemoPageComponent {
  /** Selector shown above the title, such as `s-text`. */
  @Input() selector = '';
  @Input() title = '';
  @Input() lead = '';
}
