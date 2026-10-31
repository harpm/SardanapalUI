import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { GridSearchModelFactory, Response, type GridResult, type SelectOption } from '@sardanapal/client';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { of } from 'rxjs';
import {
  SARDANAPAL_DIRECTION_SERVICE,
  SardanapalGridComponent,
  SardanapalNgLocaleService,
  SardanapalNumericComponent,
  SardanapalSelectComponent,
  SardanapalTextAreaComponent,
  SardanapalTextBoxComponent,
  SardanapalTextComponent,
  type SardanapalGridColumn,
  type SardanapalGridSource,
} from '@sardanapal/ng';

interface Person {
  id: number;
  name: string;
  age: number;
}

/** Local rows that stand in for a host until the demo gets a mock adapter. */
class DemoPeople {
  private static readonly rows: Person[] = [
    { id: 1, name: 'Ali', age: 31 },
    { id: 2, name: 'Sara', age: 27 },
    { id: 3, name: 'Reza', age: 45 },
  ];

  static readonly source: SardanapalGridSource<Person> = {
    $getAll: (model) => {
      const search = GridSearchModelFactory.create(model);
      const rows = [...DemoPeople.rows];
      const sortId = search.sortId as keyof Person | undefined;
      if (sortId) {
        rows.sort((a, b) => (a[sortId] > b[sortId] ? 1 : a[sortId] < b[sortId] ? -1 : 0));
        if (!search.sortAscending) {
          rows.reverse();
        }
      }
      const data: GridResult<Person> = {
        list: rows,
        searchModel: { ...search, totalCount: rows.length },
      };
      return of(new Response({ statusCode: 0, data }));
    },
  };
}

@Component({
  selector: 'app-root',
  imports: [
    NzButtonModule,
    ReactiveFormsModule,
    SardanapalTextComponent,
    SardanapalTextBoxComponent,
    SardanapalTextAreaComponent,
    SardanapalNumericComponent,
    SardanapalSelectComponent,
    SardanapalGridComponent,
  ],
  styles: [':host { display: block; max-width: 640px; margin: 24px auto; } s-text-box, s-text-area, s-numeric, s-select { margin-bottom: 12px; }'],
  template: `
    <h1>Sardanapal UI demo</h1>
    <p>Culture: {{ locale.culture() }}</p>
    <button nz-button nzType="primary" (click)="useEnglish()">English (ltr)</button>
    <button nz-button (click)="usePersian()">Persian (rtl)</button>

    <h2>Controls</h2>
    <s-text-box [formControl]="name" placeholder="Name" />
    <s-text-area [formControl]="notes" placeholder="Notes" />
    <s-numeric [formControl]="age" [min]="0" [max]="120" placeholder="Age" />
    <s-select [formControl]="role" [options]="roles" placeholder="Role" />
    <p>Name: <s-text [value]="name.value" emptyText="(empty)" /> | Age: <s-text [value]="age.value" emptyText="(empty)" /></p>

    <h2>Grid</h2>
    <s-grid [client]="people" [columns]="columns" [pageSizeOptions]="[10, 25]" />
  `,
})
export class AppComponent {
  protected readonly locale = inject(SardanapalNgLocaleService);
  private readonly direction = inject(SARDANAPAL_DIRECTION_SERVICE);

  protected readonly name = new FormControl('');
  protected readonly notes = new FormControl('');
  protected readonly age = new FormControl<number | null>(null);
  protected readonly role = new FormControl<number | null>(null);
  protected readonly roles: SelectOption<number>[] = [
    { key: 1, value: 'Admin' },
    { key: 2, value: 'Editor' },
    { key: 3, value: 'Viewer' },
  ];
  protected readonly people = DemoPeople.source;
  protected readonly columns: SardanapalGridColumn<Person>[] = [
    { field: 'name', title: 'Name', sortable: true },
    { field: 'age', title: 'Age', sortable: true, align: 'right' },
  ];

  /** Language and direction are separate services, so the app sets both. */
  protected useEnglish(): void {
    this.locale.setCulture('en');
    this.direction.setDirection('ltr');
  }

  protected usePersian(): void {
    this.locale.setCulture('fa-IR');
    this.direction.setDirection('rtl');
  }
}
