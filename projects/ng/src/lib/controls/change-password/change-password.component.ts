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
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { SardanapalAccountClient, type Session } from '@harpm/sardanapal-identity-client';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { catchError, finalize, of, switchMap, tap, type Observable } from 'rxjs';
import { SardanapalChangePasswordModel, type SardanapalChangePasswordLabels } from '../../models/models';
import { SARDANAPAL_AUTH_SERVICE, SARDANAPAL_HTTP_CLIENT } from '../../tokens';
import { SardanapalPasswordComponent } from '../password/password.component';
import { SardanapalTextBoxComponent } from '../text-box/text-box.component';

/**
 * Change-password form. It calls `$changePassword`, then `logout()` and `$login`
 * with the new password so the session JWT no longer carries `must_change_pw`.
 */
@Component({
  selector: 's-change-password',
  imports: [FormsModule, NzButtonModule, SardanapalTextBoxComponent, SardanapalPasswordComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './change-password.component.css',
  templateUrl: './change-password.component.html',
})
export class SardanapalChangePasswordComponent implements OnChanges {
  private static readonly DEFAULT_LABELS: Required<SardanapalChangePasswordLabels> = {
    username: 'Username',
    oldPassword: 'Current password',
    newPassword: 'New password',
    confirmPassword: 'Confirm password',
    submit: 'Change password',
  };

  @Input() username = '';
  @Input() oldPassword = '';
  @Input({ transform: booleanAttribute }) rememberMe = false;
  /** Prebuilt account client. Built from the injected auth service when omitted. */
  @Input() account: SardanapalAccountClient | null = null;
  @Input() labels: SardanapalChangePasswordLabels = {};

  @Output() readonly changed = new EventEmitter<Session>();

  protected readonly loading = signal(false);
  protected readonly userMessage = signal('');
  protected readonly model = new SardanapalChangePasswordModel();

  private readonly auth = inject(SARDANAPAL_AUTH_SERVICE);
  private readonly http = inject(SARDANAPAL_HTTP_CLIENT);
  private readonly destroyRef = inject(DestroyRef);
  private builtAccount: SardanapalAccountClient | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if ('username' in changes) {
      this.model.username = this.username;
    }
    if ('oldPassword' in changes) {
      this.model.oldPassword = this.oldPassword;
    }
  }

  protected label(key: keyof SardanapalChangePasswordLabels): string {
    return this.labels[key] ?? SardanapalChangePasswordComponent.DEFAULT_LABELS[key];
  }

  protected submit(): void {
    const username = this.model.username.trim();
    const oldPassword = this.model.oldPassword;
    const newPassword = this.model.newPassword;
    const confirmPassword = this.model.confirmPassword;
    if (!username) {
      this.userMessage.set('Username is required.');
      return;
    }
    if (!oldPassword) {
      this.userMessage.set('Current password is required.');
      return;
    }
    if (!newPassword) {
      this.userMessage.set('New password is required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      this.userMessage.set('Passwords do not match.');
      return;
    }
    this.run(
      this.accountClient()
        .$changePassword({ username, oldPassword, newPassword })
        .pipe(
          switchMap((result) => {
            if (!result.isSuccess) {
              this.userMessage.set(result.userMessage ?? '');
              return of(undefined);
            }
            this.auth.logout();
            this.auth.setRememberMe(this.rememberMe);
            return this.auth.$login(username, newPassword).pipe(
              tap((login) => {
                if (!login.isSuccess) {
                  this.userMessage.set(login.userMessage ?? '');
                  return;
                }
                this.changed.emit(this.auth.getSession());
              }),
            );
          }),
        ),
    );
  }

  private accountClient(): SardanapalAccountClient {
    if (this.account) {
      return this.account;
    }
    this.builtAccount ??= new SardanapalAccountClient({
      auth: this.auth,
      client: this.http,
    });
    return this.builtAccount;
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
