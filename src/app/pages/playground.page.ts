import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { GridSearchModelFactory, Response, type GridResult, type SelectOption } from '@harpm/sardanapal-client';
import type { Session } from '@harpm/sardanapal-identity-client';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { of } from 'rxjs';
import {
  SardanapalAlign,
  SardanapalChangePasswordComponent,
  SardanapalCheckboxComponent,
  SardanapalDateComponent,
  SardanapalGridComponent,
  SardanapalLoginComponent,
  SardanapalLoginPlacement,
  SardanapalNumericComponent,
  SardanapalPasswordComponent,
  SardanapalSelectComponent,
  SardanapalSwitchComponent,
  SardanapalTextAreaComponent,
  SardanapalTextBoxComponent,
  SardanapalTextComponent,
  type SardanapalGridColumn,
  type SardanapalGridSource,
} from '@harpm/sardanapal-ng';

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

/** Unguarded control catalog. */
@Component({
  selector: 'app-playground-page',
  imports: [
    NzButtonModule,
    ReactiveFormsModule,
    SardanapalTextComponent,
    SardanapalTextBoxComponent,
    SardanapalTextAreaComponent,
    SardanapalNumericComponent,
    SardanapalSelectComponent,
    SardanapalDateComponent,
    SardanapalCheckboxComponent,
    SardanapalSwitchComponent,
    SardanapalPasswordComponent,
    SardanapalChangePasswordComponent,
    SardanapalGridComponent,
    SardanapalLoginComponent,
  ],
  styleUrl: './playground.page.css',
  templateUrl: './playground.page.html',
})
export class PlaygroundPageComponent {
  protected readonly name = new FormControl('');
  protected readonly notes = new FormControl('');
  protected readonly age = new FormControl<number | null>(null);
  protected readonly role = new FormControl<number | null>(null);
  protected readonly born = new FormControl<Date | null>(null);
  protected readonly secret = new FormControl('');
  protected readonly agree = new FormControl(false);
  protected readonly active = new FormControl(true);
  protected readonly roles: SelectOption<number>[] = [
    { key: 1, value: 'Admin' },
    { key: 2, value: 'Editor' },
    { key: 3, value: 'Viewer' },
  ];
  protected readonly people = DemoPeople.source;
  protected readonly columns: SardanapalGridColumn<Person>[] = [
    { field: 'name', title: 'Name', sortable: true },
    { field: 'age', title: 'Age', sortable: true, align: SardanapalAlign.Right },
  ];
  protected readonly Placement = SardanapalLoginPlacement;
  protected loginPlacement = SardanapalLoginPlacement.Middle;
  protected loginSession: Session | null = null;

  protected placeLogin(placement: SardanapalLoginPlacement): void {
    this.loginPlacement = placement;
  }

  protected onLoggedIn(session: Session): void {
    this.loginSession = session;
  }
}
