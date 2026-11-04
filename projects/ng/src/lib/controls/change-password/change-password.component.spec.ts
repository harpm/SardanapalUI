import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { Session } from '@harpm/sardanapal-identity-client';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SARDANAPAL_AUTH_SERVICE,
  SARDANAPAL_HTTP_CLIENT,
  SardanapalChangePasswordComponent,
} from '../../../public-api';
import { ControlTestKit } from '../test-kit';

class ChangePasswordTestKit {
  static auth: {
    $login: ReturnType<typeof vi.fn>;
    setRememberMe: ReturnType<typeof vi.fn>;
    getSession: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };
  static account: {
    $changePassword: ReturnType<typeof vi.fn>;
  };

  static reset(): void {
    ChangePasswordTestKit.auth = {
      $login: vi.fn(() => of(ControlTestKit.ok({ token: 't' }))),
      setRememberMe: vi.fn(),
      getSession: vi.fn(() => ChangePasswordTestKit.session()),
      logout: vi.fn(),
    };
    ChangePasswordTestKit.account = {
      $changePassword: vi.fn(() => of(ControlTestKit.ok(true))),
    };
  }

  static session(): Session {
    return {
      token: 't',
      claims: {
        id: '7',
        roles: [],
        accessRights: [],
        controllerActions: [],
        mustChangePassword: false,
        exp: null,
      },
      mustChangePassword: false,
    };
  }

  static async render(): Promise<ComponentFixture<ChangePasswordHostComponent>> {
    const fixture = TestBed.createComponent(ChangePasswordHostComponent);
    fixture.componentInstance.account = ChangePasswordTestKit.account as never;
    await ChangePasswordTestKit.settle(fixture);
    return fixture;
  }

  static async settle(fixture: ComponentFixture<unknown>): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  static input(fixture: ComponentFixture<unknown>, placeholder: string): HTMLInputElement {
    return (fixture.nativeElement as HTMLElement).querySelector(
      `input[placeholder="${placeholder}"]`,
    ) as HTMLInputElement;
  }

  static button(fixture: ComponentFixture<unknown>): HTMLButtonElement {
    return (fixture.nativeElement as HTMLElement).querySelector('button') as HTMLButtonElement;
  }

  static async type(
    fixture: ComponentFixture<unknown>,
    placeholder: string,
    text: string,
  ): Promise<void> {
    ControlTestKit.type(ChangePasswordTestKit.input(fixture, placeholder), text);
    await ChangePasswordTestKit.settle(fixture);
  }
}

@Component({
  imports: [SardanapalChangePasswordComponent],
  template: `
    <s-change-password
      [username]="username()"
      [oldPassword]="oldPassword()"
      [rememberMe]="rememberMe()"
      [account]="account"
      (changed)="sessions.push($event)"
    />
  `,
})
class ChangePasswordHostComponent {
  readonly username = signal('');
  readonly oldPassword = signal('');
  readonly rememberMe = signal(false);
  account = ChangePasswordTestKit.account as never;
  readonly sessions: Session[] = [];
}

describe('s-change-password', () => {
  beforeEach(() => {
    ControlTestKit.installBrowserStubs();
    TestBed.resetTestingModule();
    ChangePasswordTestKit.reset();
    TestBed.configureTestingModule({
      providers: [
        { provide: SARDANAPAL_AUTH_SERVICE, useValue: ChangePasswordTestKit.auth },
        { provide: SARDANAPAL_HTTP_CLIENT, useValue: {} },
      ],
    });
  });

  it('prefills username and the current password', async () => {
    const fixture = await ChangePasswordTestKit.render();
    fixture.componentInstance.username.set('ada');
    fixture.componentInstance.oldPassword.set('old');
    await ChangePasswordTestKit.settle(fixture);

    expect(ChangePasswordTestKit.input(fixture, 'Username').value).toBe('ada');
    expect(ChangePasswordTestKit.input(fixture, 'Current password').value).toBe('old');
  });

  it('changes the password, signs in again, and emits the session', async () => {
    const fixture = await ChangePasswordTestKit.render();
    await ChangePasswordTestKit.type(fixture, 'Username', 'ada');
    await ChangePasswordTestKit.type(fixture, 'Current password', 'old');
    await ChangePasswordTestKit.type(fixture, 'New password', 'fresh');
    await ChangePasswordTestKit.type(fixture, 'Confirm password', 'fresh');
    fixture.componentInstance.rememberMe.set(true);
    await ChangePasswordTestKit.settle(fixture);
    ChangePasswordTestKit.button(fixture).click();
    await ChangePasswordTestKit.settle(fixture);

    expect(ChangePasswordTestKit.account.$changePassword).toHaveBeenCalledWith({
      username: 'ada',
      oldPassword: 'old',
      newPassword: 'fresh',
    });
    expect(ChangePasswordTestKit.auth.logout).toHaveBeenCalled();
    expect(ChangePasswordTestKit.auth.setRememberMe).toHaveBeenCalledWith(true);
    expect(ChangePasswordTestKit.auth.$login).toHaveBeenCalledWith('ada', 'fresh');
    expect(fixture.componentInstance.sessions).toEqual([ChangePasswordTestKit.session()]);
  });

  it('shows a failure envelope on the form and does not emit', async () => {
    ChangePasswordTestKit.account.$changePassword.mockReturnValue(
      of(ControlTestKit.failed('Wrong password.')),
    );
    const fixture = await ChangePasswordTestKit.render();
    await ChangePasswordTestKit.type(fixture, 'Username', 'ada');
    await ChangePasswordTestKit.type(fixture, 'Current password', 'old');
    await ChangePasswordTestKit.type(fixture, 'New password', 'fresh');
    await ChangePasswordTestKit.type(fixture, 'Confirm password', 'fresh');
    ChangePasswordTestKit.button(fixture).click();
    await ChangePasswordTestKit.settle(fixture);

    expect((fixture.nativeElement as HTMLElement).querySelector('.s-change-password-message')?.textContent).toBe(
      'Wrong password.',
    );
    expect(fixture.componentInstance.sessions).toEqual([]);
    expect(ChangePasswordTestKit.auth.logout).not.toHaveBeenCalled();
  });

  it('does not show a form message when the request is rejected', async () => {
    ChangePasswordTestKit.account.$changePassword.mockReturnValue(throwError(() => new Error('offline')));
    const fixture = await ChangePasswordTestKit.render();
    await ChangePasswordTestKit.type(fixture, 'Username', 'ada');
    await ChangePasswordTestKit.type(fixture, 'Current password', 'old');
    await ChangePasswordTestKit.type(fixture, 'New password', 'fresh');
    await ChangePasswordTestKit.type(fixture, 'Confirm password', 'fresh');
    ChangePasswordTestKit.button(fixture).click();
    await ChangePasswordTestKit.settle(fixture);

    expect((fixture.nativeElement as HTMLElement).querySelector('.s-change-password-message')).toBeNull();
    expect(fixture.componentInstance.sessions).toEqual([]);
  });
});
