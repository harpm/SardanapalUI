import { Component, signal, ViewChild } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { GridResult } from '@sardanapal/client';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzTableComponent, NzThAddOnComponent } from 'ng-zorro-antd/table';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SardanapalGridComponent,
  type SardanapalGridColumn,
  type SardanapalGridSource,
} from '../../../public-api';
import { ControlTestKit } from '../test-kit';

interface Person {
  id: number;
  name: string;
  address: { city: string } | null;
  born: Date | null;
}

@Component({
  imports: [SardanapalGridComponent],
  template: `
    <s-grid
      [client]="client()"
      [columns]="columns"
      [searchFields]="fields()"
      [pageSize]="pageSize()"
      (loaded)="loaded.push($event)"
    />
  `,
})
class GridHostComponent {
  readonly client = signal<SardanapalGridSource<Person>>(GridTestKit.client(GridTestKit.people));
  readonly fields = signal<unknown>(null);
  readonly pageSize = signal(25);
  @ViewChild(SardanapalGridComponent) grid!: SardanapalGridComponent<Person>;
  readonly loaded: GridResult<Person>[] = [];
  readonly columns: SardanapalGridColumn<Person>[] = [
    { field: 'name', title: 'Name', sortable: true, width: '200px' },
    { field: 'address.city', title: 'City' },
    { field: 'born', title: 'Born', format: (value) => (value ? 'known' : 'unknown') },
  ];
}

class GridTestKit {
  static readonly people: Person[] = [
    { id: 1, name: 'Ali', address: { city: 'Tehran' }, born: new Date(2000, 0, 1) },
    { id: 2, name: 'Sara', address: null, born: null },
  ];

  static client(list: Person[], total = list.length) {
    return { $getAll: vi.fn(() => of(ControlTestKit.page(list, total))) } as SardanapalGridSource<Person> & {
      $getAll: ReturnType<typeof vi.fn>;
    };
  }

  static async render(client?: SardanapalGridSource<Person>): Promise<ComponentFixture<GridHostComponent>> {
    const fixture = TestBed.createComponent(GridHostComponent);
    if (client) {
      fixture.componentInstance.client.set(client);
    }
    await GridTestKit.settle(fixture);
    return fixture;
  }

  static async settle(fixture: ComponentFixture<unknown>): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  static cells(fixture: ComponentFixture<unknown>): string[][] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr:not(.ant-table-placeholder)'),
    ).map((row) => Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent?.trim() ?? ''));
  }

  static table(fixture: ComponentFixture<unknown>) {
    return fixture.debugElement.query(By.directive(NzTableComponent));
  }

  static header(fixture: ComponentFixture<unknown>, index: number) {
    return fixture.debugElement.queryAll(By.directive(NzThAddOnComponent))[index];
  }

  static calls(client: { $getAll: ReturnType<typeof vi.fn> }): Record<string, unknown>[] {
    return client.$getAll.mock.calls.map((call) => call[0] as Record<string, unknown>);
  }
}

describe('s-grid', () => {
  beforeEach(() => ControlTestKit.installBrowserStubs());

  it('loads the first page when created', async () => {
    const client = GridTestKit.client(GridTestKit.people);
    const fixture = await GridTestKit.render(client);

    expect(GridTestKit.calls(client)).toEqual([
      { fields: null, sortId: undefined, sortAscending: true, pageIndex: 0, pageSize: 25 },
    ]);
    expect(fixture.componentInstance.loaded).toHaveLength(1);
  });

  it('shows rows by column, with dotted paths, empty values and formatters', async () => {
    const fixture = await GridTestKit.render();

    expect(GridTestKit.cells(fixture)).toEqual([
      ['Ali', 'Tehran', 'known'],
      ['Sara', '', 'unknown'],
    ]);
  });

  it('shows the column titles', async () => {
    const fixture = await GridTestKit.render();

    const titles = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('thead th')).map((th) =>
      th.textContent?.trim(),
    );
    expect(titles).toEqual(['Name', 'City', 'Born']);
  });

  it('asks for the next page, zero-based, and keeps the total', async () => {
    const client = GridTestKit.client(GridTestKit.people, 80);
    const fixture = await GridTestKit.render(client);

    GridTestKit.table(fixture).triggerEventHandler('nzPageIndexChange', 3);
    await GridTestKit.settle(fixture);

    expect(GridTestKit.calls(client).at(-1)).toMatchObject({ pageIndex: 2, pageSize: 25 });
    expect(GridTestKit.table(fixture).componentInstance.nzTotal).toBe(80);
  });

  it('does not reload for the page it is already on', async () => {
    const client = GridTestKit.client(GridTestKit.people);
    const fixture = await GridTestKit.render(client);

    GridTestKit.table(fixture).triggerEventHandler('nzPageIndexChange', 1);

    expect(client.$getAll).toHaveBeenCalledTimes(1);
  });

  it('goes back to the first page when the page size changes', async () => {
    const client = GridTestKit.client(GridTestKit.people, 200);
    const fixture = await GridTestKit.render(client);
    GridTestKit.table(fixture).triggerEventHandler('nzPageIndexChange', 3);

    GridTestKit.table(fixture).triggerEventHandler('nzPageSizeChange', 50);
    await GridTestKit.settle(fixture);

    expect(GridTestKit.calls(client).at(-1)).toMatchObject({ pageIndex: 0, pageSize: 50 });
  });

  it('sorts by a column, then flips the direction, from the first page', async () => {
    const client = GridTestKit.client(GridTestKit.people, 80);
    const fixture = await GridTestKit.render(client);
    GridTestKit.table(fixture).triggerEventHandler('nzPageIndexChange', 2);

    GridTestKit.header(fixture, 0).triggerEventHandler('nzSortOrderChange', 'ascend');
    expect(GridTestKit.calls(client).at(-1)).toMatchObject({ sortId: 'name', sortAscending: true, pageIndex: 0 });

    GridTestKit.header(fixture, 0).triggerEventHandler('nzSortOrderChange', 'descend');
    expect(GridTestKit.calls(client).at(-1)).toMatchObject({ sortId: 'name', sortAscending: false });
    expect(client.$getAll).toHaveBeenCalledTimes(4);
  });

  it('clears the sort when the sorted column is cleared, and ignores other columns that report null', async () => {
    const client = GridTestKit.client(GridTestKit.people);
    const fixture = await GridTestKit.render(client);
    const header = GridTestKit.header(fixture, 0);

    header.triggerEventHandler('nzSortOrderChange', null);
    expect(client.$getAll).toHaveBeenCalledTimes(1);

    header.triggerEventHandler('nzSortOrderChange', 'ascend');
    header.triggerEventHandler('nzSortOrderChange', null);

    expect(GridTestKit.calls(client).at(-1)).toMatchObject({ sortId: undefined, sortAscending: true });
  });

  it('searches from the first page when the search fields change', async () => {
    const client = GridTestKit.client(GridTestKit.people, 80);
    const fixture = await GridTestKit.render(client);
    GridTestKit.table(fixture).triggerEventHandler('nzPageIndexChange', 3);

    fixture.componentInstance.fields.set({ name: 'al' });
    await GridTestKit.settle(fixture);

    expect(GridTestKit.calls(client).at(-1)).toMatchObject({ fields: { name: 'al' }, pageIndex: 0 });
  });

  it('loads again from the new client', async () => {
    const first = GridTestKit.client(GridTestKit.people);
    const second = GridTestKit.client([{ id: 9, name: 'Reza', address: null, born: null }]);
    const fixture = await GridTestKit.render(first);

    fixture.componentInstance.client.set(second);
    await GridTestKit.settle(fixture);

    expect(second.$getAll).toHaveBeenCalledTimes(1);
    expect(GridTestKit.cells(fixture)).toEqual([['Reza', '', 'unknown']]);
  });

  it('reload fetches the current page again', async () => {
    const client = GridTestKit.client(GridTestKit.people, 80);
    const fixture = await GridTestKit.render(client);
    GridTestKit.table(fixture).triggerEventHandler('nzPageIndexChange', 2);

    fixture.componentInstance.grid.reload();

    expect(GridTestKit.calls(client).at(-1)).toMatchObject({ pageIndex: 1 });
    expect(client.$getAll).toHaveBeenCalledTimes(3);
  });

  it('shows the user message of a failure envelope and empties the grid', async () => {
    const message = TestBed.inject(NzMessageService);
    const error = vi.spyOn(message, 'error').mockReturnValue(undefined as never);
    const client = { $getAll: vi.fn(() => of(ControlTestKit.failed<GridResult<Person>>('Not allowed'))) };

    const fixture = await GridTestKit.render(client as never);

    expect(error).toHaveBeenCalledWith('Not allowed');
    expect(GridTestKit.cells(fixture)).toEqual([]);
    expect(fixture.componentInstance.loaded).toEqual([]);
  });

  it('empties the grid when the request fails and recovers on reload', async () => {
    let fail = true;
    const client = {
      $getAll: vi.fn(() =>
        fail ? throwError(() => new Error('down')) : of(ControlTestKit.page(GridTestKit.people)),
      ),
    };
    const fixture = await GridTestKit.render(client as never);
    expect(GridTestKit.cells(fixture)).toEqual([]);

    fail = false;
    fixture.componentInstance.grid.reload();
    await GridTestKit.settle(fixture);

    expect(GridTestKit.cells(fixture)).toHaveLength(2);
  });
});
