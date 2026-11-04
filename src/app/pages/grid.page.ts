import { Component } from '@angular/core';
import {
  GridSearchModelFactory,
  Response,
  type GridResult,
  type GridSearchModel,
  type IResponse,
} from '@harpm/sardanapal-client';
import {
  SardanapalAlign,
  SardanapalGridComponent,
  type SardanapalGridColumn,
  type SardanapalGridSource,
} from '@harpm/sardanapal-ng';
import { of, type Observable } from 'rxjs';
import { DemoPageComponent } from './demo-page.component';

interface Person {
  id: number;
  name: string;
  age: number;
}

/** Local rows that stand in for a host until the demo gets a mock adapter. */
class DemoPeople implements SardanapalGridSource<Person> {
  private static readonly rows: Person[] = [
    { id: 1, name: 'Ali', age: 31 },
    { id: 2, name: 'Sara', age: 27 },
    { id: 3, name: 'Reza', age: 45 },
  ];

  $getAll(model?: Partial<GridSearchModel> | null): Observable<IResponse<GridResult<Person>>> {
    const search = GridSearchModelFactory.create(model);
    const rows = [...DemoPeople.rows];
    const sortId = search.sortId as keyof Person | undefined;
    if (sortId) {
      rows.sort((left, right) => DemoPeople.compare(left, right, sortId));
      if (!search.sortAscending) {
        rows.reverse();
      }
    }
    const data: GridResult<Person> = {
      list: rows,
      searchModel: { ...search, totalCount: rows.length },
    };
    return of(new Response({ statusCode: 0, data }));
  }

  private static compare(left: Person, right: Person, sortId: keyof Person): number {
    if (left[sortId] > right[sortId]) {
      return 1;
    }
    if (left[sortId] < right[sortId]) {
      return -1;
    }
    return 0;
  }
}

/** Grid backed by local rows, with paging and sorting. */
@Component({
  selector: 'app-grid-page',
  imports: [DemoPageComponent, SardanapalGridComponent],
  template: `
    <app-demo-page
      selector="s-grid"
      title="Grid"
      lead="Pages and sorts through getAll. These rows are local stand-ins. Sorting and the page size go through the same search model a host would receive."
    >
      <s-grid [client]="people" [columns]="columns" [pageSizeOptions]="[10, 25]" />
    </app-demo-page>
  `,
})
export class GridPageComponent {
  protected readonly people = new DemoPeople();
  protected readonly columns: SardanapalGridColumn<Person>[] = [
    { field: 'name', title: 'Name', sortable: true },
    { field: 'age', title: 'Age', sortable: true, align: SardanapalAlign.Right },
  ];
}
