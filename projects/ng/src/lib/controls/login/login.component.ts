import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  inject,
  Input,
  Output,
  signal,
  type OnChanges,
  type SimpleChanges,
  type TemplateRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import type { IResponse } from '@harpm/sardanapal-client';
import { SARDANAPAL_AUTH_SERVICE, SARDANAPAL_HTTP_CLIENT } from '../../tokens';
import {
  SardanapalOtpAccountClient,
  type Session,
} from '@harpm/sardanapal-identity-client';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { catchError, finalize, of, switchMap, tap, type Observable } from 'rxjs';
import { SardanapalLoginModel, type SardanapalLoginLabels } from '../../models/models';
import {
  SardanapalLoginMethod,
  SardanapalLoginOtpStep,
  SardanapalLoginPlacement,
} from '../../types/types';
import { SardanapalCheckboxComponent } from '../checkbox/checkbox.component';
import { SardanapalPasswordComponent } from '../password/password.component';
import { SardanapalTextBoxComponent } from '../text-box/text-box.component';

/**
 * Full-page login card: password, email OTP and phone OTP. It stores the token
 * and applies remember-me, then emits the session. Change password is `s-change-password`.
 */
@Component({
  selector: 's-login',
  imports: [
    NgTemplateOutlet,
    FormsModule,
    NzButtonModule,
    NzTabsModule,
    SardanapalTextBoxComponent,
    SardanapalPasswordComponent,
    SardanapalCheckboxComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './login.component.css',
  templateUrl: './login.component.html',
})
export class SardanapalLoginComponent implements OnChanges {
  private static readonly DEFAULT_LABELS: Required<SardanapalLoginLabels> = {
    username: 'Username',
    password: 'Password',
    email: 'Email',
    phone: 'Phone number',
    code: 'Code',
    rememberMe: 'Remember me',
    signIn: 'Sign in',
    sendCode: 'Send code',
    passwordTab: 'Password',
    emailTab: 'Email',
    phoneTab: 'Phone',
  };

  @Input({ transform: booleanAttribute }) usernamePassword = true;
  @Input({ transform: booleanAttribute }) emailOtp = true;
  @Input({ transform: booleanAttribute }) phoneOtp = true;
  @Input() placement: SardanapalLoginPlacement = SardanapalLoginPlacement.Middle;
  @Input() background: TemplateRef<unknown> | null = null;
  /** Identity OTP `role` / `roleId`. Required to send an email or phone code. */
  @Input() role: number | null = null;
  /** Prebuilt OTP/account client. Built from the injected auth service when omitted. */
  @Input() otp: SardanapalOtpAccountClient | null = null;
  @Input() labels: SardanapalLoginLabels = {};

  @Output() readonly loggedIn = new EventEmitter<Session>();

  protected readonly Placement = SardanapalLoginPlacement;
  protected readonly Method = SardanapalLoginMethod;
  protected readonly OtpStep = SardanapalLoginOtpStep;
  protected readonly methods = signal<SardanapalLoginMethod[]>([
    SardanapalLoginMethod.Password,
    SardanapalLoginMethod.Email,
    SardanapalLoginMethod.Phone,
  ]);
  protected readonly activeMethod = signal(SardanapalLoginMethod.Password);
  protected readonly otpStep = signal(SardanapalLoginOtpStep.Request);
  protected readonly loading = signal(false);
  protected readonly userMessage = signal('');
  protected readonly model = new SardanapalLoginModel();

  private readonly auth = inject(SARDANAPAL_AUTH_SERVICE);
  private readonly http = inject(SARDANAPAL_HTTP_CLIENT);
  private readonly destroyRef = inject(DestroyRef);
  private builtOtp: SardanapalOtpAccountClient | null = null;
  private otpUserId: number | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if ('usernamePassword' in changes || 'emailOtp' in changes || 'phoneOtp' in changes) {
      const methods = this.enabledMethods();
      this.methods.set(methods);
      if (!methods.includes(this.activeMethod())) {
        this.activeMethod.set(methods[0] ?? SardanapalLoginMethod.Password);
        this.resetOtpStep();
      }
    }
  }

  protected label(key: keyof SardanapalLoginLabels): string {
    return this.labels[key] ?? SardanapalLoginComponent.DEFAULT_LABELS[key];
  }

  protected tabIndex(): number {
    const index = this.methods().indexOf(this.activeMethod());
    return index < 0 ? 0 : index;
  }

  protected onTabIndex(index: number): void {
    const method = this.methods()[index];
    if (!method || method === this.activeMethod()) {
      return;
    }
    this.activeMethod.set(method);
    this.resetOtpStep();
    this.userMessage.set('');
  }

  protected submitPassword(): void {
    const username = this.model.username.trim();
    const password = this.model.password;
    if (!username) {
      this.userMessage.set('Username is required.');
      return;
    }
    if (!password) {
      this.userMessage.set('Password is required.');
      return;
    }
    this.run(
      this.withRememberMe().pipe(
        switchMap(() => this.auth.$login(username, password)),
        tap((result) => this.afterAuth(result)),
      ),
    );
  }

  protected requestEmailCode(): void {
    const email = this.model.email.trim();
    if (!email) {
      this.userMessage.set('Email is required.');
      return;
    }
    const role = this.otpRole();
    if (role === null) {
      return;
    }
    this.run(
      this.otpClient()
        .$requestLoginOtp({ email, role })
        .pipe(tap((result) => this.afterOtpRequest(result))),
    );
  }

  protected requestPhoneCode(): void {
    const phoneNumber = this.phoneNumberOf(this.model.phone);
    if (phoneNumber === null) {
      this.userMessage.set('Phone number is invalid.');
      return;
    }
    const role = this.otpRole();
    if (role === null) {
      return;
    }
    this.run(
      this.otpClient()
        .$requestLoginOtp({ phoneNumber, role })
        .pipe(tap((result) => this.afterOtpRequest(result))),
    );
  }

  protected submitEmailOtp(): void {
    this.submitOtp();
  }

  protected submitPhoneOtp(): void {
    this.submitOtp();
  }

  private submitOtp(): void {
    const code = this.model.code.trim();
    if (!code) {
      this.userMessage.set('Code is required.');
      return;
    }
    if (this.otpUserId === null) {
      this.userMessage.set('Code is required.');
      return;
    }
    const role = this.otpRole();
    if (role === null) {
      return;
    }
    this.run(
      this.withRememberMe().pipe(
        switchMap(() => this.otpClient().$loginWithOtp({ userId: this.otpUserId as number, roleId: role, code })),
        tap((result) => this.afterAuth(result)),
      ),
    );
  }

  private afterOtpRequest(result: IResponse<number>): void {
    if (!result.isSuccess) {
      this.userMessage.set(result.userMessage ?? '');
      return;
    }
    if (result.data === undefined || result.data === null) {
      this.userMessage.set('The host did not return a user key.');
      return;
    }
    this.otpUserId = result.data;
    this.otpStep.set(SardanapalLoginOtpStep.Code);
  }

  private afterAuth(result: IResponse<unknown>): void {
    if (!result.isSuccess) {
      this.userMessage.set(result.userMessage ?? '');
      return;
    }
    this.loggedIn.emit(this.auth.getSession());
  }

  private withRememberMe(): Observable<void> {
    this.auth.setRememberMe(this.remembered());
    return of(undefined);
  }

  private remembered(): boolean {
    return this.model.rememberMe;
  }

  private otpRole(): number | null {
    if (this.role === null || this.role === undefined) {
      this.userMessage.set('Role is required.');
      return null;
    }
    return this.role;
  }

  private phoneNumberOf(raw: string): number | null {
    const digits = raw.trim();
    if (!/^\d+$/.test(digits)) {
      return null;
    }
    const value = Number(digits);
    return Number.isSafeInteger(value) ? value : null;
  }

  private otpClient(): SardanapalOtpAccountClient {
    if (this.otp) {
      return this.otp;
    }
    this.builtOtp ??= new SardanapalOtpAccountClient({
      auth: this.auth,
      client: this.http,
    });
    return this.builtOtp;
  }

  private enabledMethods(): SardanapalLoginMethod[] {
    const methods: SardanapalLoginMethod[] = [];
    if (this.usernamePassword) {
      methods.push(SardanapalLoginMethod.Password);
    }
    if (this.emailOtp) {
      methods.push(SardanapalLoginMethod.Email);
    }
    if (this.phoneOtp) {
      methods.push(SardanapalLoginMethod.Phone);
    }
    return methods;
  }

  private resetOtpStep(): void {
    this.otpStep.set(SardanapalLoginOtpStep.Request);
    this.otpUserId = null;
    this.model.code = '';
  }

  private run(work: Observable<unknown>): void {
    if (this.loading()) {
      return;
    }
    this.loading.set(true);
    this.userMessage.set('');
    work
      .pipe(
        catchError(() => of(undefined)),
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }
}
