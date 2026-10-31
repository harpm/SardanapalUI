import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { Response, type GridResult, type IResponse } from '@sardanapal/client';

/** Helpers for the control specs. Not part of the package: `tsconfig.lib.json` leaves it out. */
export class ControlTestKit {
  /** jsdom has neither `ResizeObserver` nor `matchMedia`, and ng-zorro uses both. */
  static installBrowserStubs(): void {
    if (!('ResizeObserver' in globalThis)) {
      (globalThis as Record<string, unknown>)['ResizeObserver'] = class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      };
    }
    if (typeof window.matchMedia !== 'function') {
      window.matchMedia = ((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      })) as typeof window.matchMedia;
    }
  }

  /** Creates the component and waits until its forms have written their first value. */
  static async render<T>(type: new () => T): Promise<ComponentFixture<T>> {
    const fixture = TestBed.createComponent(type);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  static type(element: HTMLInputElement | HTMLTextAreaElement, text: string): void {
    element.value = text;
    element.dispatchEvent(new Event('input'));
  }

  static ok<T>(data: T): IResponse<T> {
    return new Response<T>({ statusCode: 0, data });
  }

  static failed<T>(userMessage: string): IResponse<T> {
    return new Response<T>({ statusCode: 1, userMessage });
  }

  static page<T>(list: T[], totalCount = list.length): IResponse<GridResult<T>> {
    return ControlTestKit.ok({
      list,
      searchModel: { sortAscending: true, pageIndex: 0, pageSize: 25, totalCount },
    });
  }
}
