import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { Session } from '@harpm/sardanapal-identity-client';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SARDANAPAL_AUTH_SERVICE,
  SARDANAPAL_HTTP_CLIENT,
  SardanapalLoginComponent,
  SardanapalLoginPlacement,
} from '../../../public-api';
import { ControlTestKit } from '../test-kit';

class LoginTestKit {
  static auth: {
    $login: ReturnType<typeof vi.fn>;
    setRememberMe: ReturnType<typeof vi.fn>;
    getSession: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };
  static otp: {
    $requestLoginOtp: ReturnType<typeof vi.fn>;
    $loginWithOtp: ReturnType<typeof vi.fn>;
  };

  static reset(): void {
    LoginTestKit.auth = {
      $login: vi.fn(() => of(ControlTestKit.ok({ token: 't' }))),
      setRememberMe: vi.fn(),
      getSession: vi.fn(() => LoginTestKit.session(false)),
      logout: vi.fn(),
    };
    LoginTestKit.otp = {
      $requestLoginOtp: vi.fn(() => of(ControlTestKit.ok(7))),
      $loginWithOtp: vi.fn(() => of(ControlTestKit.ok({ token: 't' }))),
    };
  }

  static session(mustChangePassword: boolean): Session {
    return {
      token: 't',
      claims: {
        id: '7',
        roles: [],
        accessRights: [],
        controllerActions: [],
        mustChangePassword,
        exp: null,
      },
      mustChangePassword,
    };
  }

  static async render(): Promise<ComponentFixture<LoginHostComponent>> {
    const fixture = TestBed.createComponent(LoginHostComponent);
    fixture.componentInstance.otp = LoginTestKit.otp as never;
    await LoginTestKit.settle(fixture);
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

  static button(fixture: ComponentFixture<unknown>, text: string): HTMLButtonElement {
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    return buttons.find((button) => button.textContent?.trim() === text) as HTMLButtonElement;
  }

  static tabs(fixture: ComponentFixture<unknown>): string[] {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.ant-tabs-tab')).map(
      (tab) => tab.textContent?.trim() ?? '',
    );
  }

  static async type(
    fixture: ComponentFixture<unknown>,
    placeholder: string,
    text: string,
  ): Promise<void> {
    ControlTestKit.type(LoginTestKit.input(fixture, placeholder), text);
    await LoginTestKit.settle(fixture);
  }
}

@Component({
  imports: [SardanapalLoginComponent],
  template: `
    <s-login
      [usernamePassword]="usernamePassword()"
      [emailOtp]="emailOtp()"
      [phoneOtp]="phoneOtp()"
      [placement]="placement()"
      [background]="showBackground() ? bg : null"
      [role]="role"
      [otp]="otp"
      (loggedIn)="sessions.push($event)"
    />
    <ng-template #bg><div class="hero">hero</div></ng-template>
  `,
})
class LoginHostComponent {
  readonly usernamePassword = signal(true);
  readonly emailOtp = signal(true);
  readonly phoneOtp = signal(true);
  readonly placement = signal(SardanapalLoginPlacement.Middle);
  readonly showBackground = signal(false);
  role: number | null = 1;
  otp = LoginTestKit.otp as never;
  readonly sessions: Session[] = [];
}

describe('s-login', () => {
  beforeEach(() => {
    ControlTestKit.installBrowserStubs();
    TestBed.resetTestingModule();
    LoginTestKit.reset();
    TestBed.configureTestingModule({
      providers: [
        { provide: SARDANAPAL_AUTH_SERVICE, useValue: LoginTestKit.auth },
        { provide: SARDANAPAL_HTTP_CLIENT, useValue: {} },
      ],
    });
  });

  it('shows a tab for each enabled method and hides tabs when only one is on', async () => {
    const fixture = await LoginTestKit.render();
    expect(LoginTestKit.tabs(fixture)).toEqual(['Password', 'Email', 'Phone']);

    fixture.componentInstance.emailOtp.set(false);
    fixture.componentInstance.phoneOtp.set(false);
    await LoginTestKit.settle(fixture);

    expect(LoginTestKit.tabs(fixture)).toEqual([]);
    expect(LoginTestKit.input(fixture, 'Username')).toBeTruthy();
  });

  it('places the card and renders an optional background', async () => {
    const fixture = await LoginTestKit.render();
    const shell = () => (fixture.nativeElement as HTMLElement).querySelector('.s-login-shell') as HTMLElement;

    expect(shell().classList.contains('s-login--middle')).toBe(true);

    fixture.componentInstance.placement.set(SardanapalLoginPlacement.Left);
    fixture.componentInstance.showBackground.set(true);
    await LoginTestKit.settle(fixture);

    expect(shell().classList.contains('s-login--left')).toBe(true);
    expect((fixture.nativeElement as HTMLElement).querySelector('.hero')?.textContent).toBe('hero');
  });

  it('signs in with a username and password and remembers the session', async () => {
    const fixture = await LoginTestKit.render();
    fixture.componentInstance.emailOtp.set(false);
    fixture.componentInstance.phoneOtp.set(false);
    await LoginTestKit.settle(fixture);

    await LoginTestKit.type(fixture, 'Username', 'ada');
    await LoginTestKit.type(fixture, 'Password', 'secret');
    ((fixture.nativeElement as HTMLElement).querySelector('input[type="checkbox"]') as HTMLInputElement).click();
    await LoginTestKit.settle(fixture);
    LoginTestKit.button(fixture, 'Sign in').click();
    await LoginTestKit.settle(fixture);

    expect(LoginTestKit.auth.setRememberMe).toHaveBeenCalledWith(true);
    expect(LoginTestKit.auth.$login).toHaveBeenCalledWith('ada', 'secret');
    expect(fixture.componentInstance.sessions).toEqual([LoginTestKit.session(false)]);
  });

  it('shows a failure envelope on the card and does not emit', async () => {
    LoginTestKit.auth.$login.mockReturnValue(of(ControlTestKit.failed('Wrong password.')));
    const fixture = await LoginTestKit.render();
    fixture.componentInstance.emailOtp.set(false);
    fixture.componentInstance.phoneOtp.set(false);
    await LoginTestKit.settle(fixture);

    await LoginTestKit.type(fixture, 'Username', 'ada');
    await LoginTestKit.type(fixture, 'Password', 'nope');
    LoginTestKit.button(fixture, 'Sign in').click();
    await LoginTestKit.settle(fixture);

    expect((fixture.nativeElement as HTMLElement).querySelector('.s-login-message')?.textContent).toBe(
      'Wrong password.',
    );
    expect(fixture.componentInstance.sessions).toEqual([]);
  });

  it('does not show a card message when the request is rejected', async () => {
    LoginTestKit.auth.$login.mockReturnValue(throwError(() => new Error('offline')));
    const fixture = await LoginTestKit.render();
    fixture.componentInstance.emailOtp.set(false);
    fixture.componentInstance.phoneOtp.set(false);
    await LoginTestKit.settle(fixture);

    await LoginTestKit.type(fixture, 'Username', 'ada');
    await LoginTestKit.type(fixture, 'Password', 'secret');
    LoginTestKit.button(fixture, 'Sign in').click();
    await LoginTestKit.settle(fixture);

    expect((fixture.nativeElement as HTMLElement).querySelector('.s-login-message')).toBeNull();
    expect(fixture.componentInstance.sessions).toEqual([]);
  });

  it('requests an email code and signs in with it', async () => {
    const fixture = await LoginTestKit.render();
    fixture.componentInstance.usernamePassword.set(false);
    fixture.componentInstance.phoneOtp.set(false);
    await LoginTestKit.settle(fixture);

    await LoginTestKit.type(fixture, 'Email', 'ada@example.com');
    LoginTestKit.button(fixture, 'Send code').click();
    await LoginTestKit.settle(fixture);

    expect(LoginTestKit.otp.$requestLoginOtp).toHaveBeenCalledWith({
      email: 'ada@example.com',
      role: 1,
    });

    await LoginTestKit.type(fixture, 'Code', '1234');
    LoginTestKit.button(fixture, 'Sign in').click();
    await LoginTestKit.settle(fixture);

    expect(LoginTestKit.auth.setRememberMe).toHaveBeenCalledWith(false);
    expect(LoginTestKit.otp.$loginWithOtp).toHaveBeenCalledWith({
      userId: 7,
      roleId: 1,
      code: '1234',
    });
    expect(fixture.componentInstance.sessions).toEqual([LoginTestKit.session(false)]);
  });

  it('requests a phone code and signs in with it', async () => {
    const fixture = await LoginTestKit.render();
    fixture.componentInstance.usernamePassword.set(false);
    fixture.componentInstance.emailOtp.set(false);
    await LoginTestKit.settle(fixture);

    await LoginTestKit.type(fixture, 'Phone number', '9120000000');
    LoginTestKit.button(fixture, 'Send code').click();
    await LoginTestKit.settle(fixture);

    expect(LoginTestKit.otp.$requestLoginOtp).toHaveBeenCalledWith({
      phoneNumber: 9120000000,
      role: 1,
    });

    await LoginTestKit.type(fixture, 'Code', '9999');
    LoginTestKit.button(fixture, 'Sign in').click();
    await LoginTestKit.settle(fixture);

    expect(LoginTestKit.otp.$loginWithOtp).toHaveBeenCalledWith({
      userId: 7,
      roleId: 1,
      code: '9999',
    });
    expect(fixture.componentInstance.sessions).toEqual([LoginTestKit.session(false)]);
  });

  it('emits the session even when the user must change their password', async () => {
    LoginTestKit.auth.getSession.mockReturnValue(LoginTestKit.session(true));
    const fixture = await LoginTestKit.render();
    fixture.componentInstance.emailOtp.set(false);
    fixture.componentInstance.phoneOtp.set(false);
    await LoginTestKit.settle(fixture);

    await LoginTestKit.type(fixture, 'Username', 'ada');
    await LoginTestKit.type(fixture, 'Password', 'old');
    LoginTestKit.button(fixture, 'Sign in').click();
    await LoginTestKit.settle(fixture);

    expect(fixture.componentInstance.sessions).toEqual([LoginTestKit.session(true)]);
    expect(LoginTestKit.input(fixture, 'Current password')).toBeNull();
  });
});
