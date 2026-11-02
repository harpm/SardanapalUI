import { StatusCode, type ClientOperation, type EntityKey, type IResponse } from '@harpm/sardanapal-client';
import { tap, type Observable } from 'rxjs';
import {
  SardanapalAccountClient,
  defaultAccountEndpoints,
  type AccountEndpointMap,
  type SardanapalAccountClientOptions,
} from '../account/sardanapal-account-client';
import type { LoginData } from '../auth/sardanapal-auth-service';
import type {
  OtpRequestModel,
  OtpResponseModel,
  RegisterModel,
  ResetPasswordModel,
  ResetPasswordRequestModel,
  UserEditableModel,
} from '../models/models';

/** Account endpoints plus one path per OTP method. Every OTP call is a `POST`. */
export interface OtpAccountEndpointMap extends AccountEndpointMap {
  requestLoginOtp: string;
  loginWithOtp: string;
  requestRegisterOtp: string;
  registerWithOtp: string;
  requestResetPassword: string;
  resetPassword: string;
}

export const defaultOtpAccountEndpoints: OtpAccountEndpointMap = {
  ...defaultAccountEndpoints,
  requestLoginOtp: 'account/request-login-otp',
  loginWithOtp: 'account/login-with-otp',
  requestRegisterOtp: 'account/request-register-otp',
  registerWithOtp: 'account/register-with-otp',
  requestResetPassword: 'account/request-reset-password',
  resetPassword: 'account/reset-password',
};

export interface SardanapalOtpAccountClientOptions extends SardanapalAccountClientOptions {
  /** Overrides applied on top of the default endpoint map. */
  endpoints?: Partial<OtpAccountEndpointMap>;
}

/**
 * Calls the host that exposes an Identity `IOtpAccountService`. It adds the OTP
 * flows to `SardanapalAccountClient`. Every OTP call is anonymous: it carries no
 * `AUTH` header and does not trigger a refresh.
 */
export class SardanapalOtpAccountClient<
  TUserKey extends EntityKey = number,
  TRegister extends RegisterModel = RegisterModel,
  TEditable extends UserEditableModel = UserEditableModel,
> extends SardanapalAccountClient<TUserKey, TRegister, TEditable> {
  protected declare readonly endpoints: OtpAccountEndpointMap;

  constructor(options: SardanapalOtpAccountClientOptions) {
    super(options, defaultOtpAccountEndpoints);
  }

  /**
   * Asks the host to send a login code. `data` is the user key to send back with
   * the code, when the host returns it (Identity's `RequestLoginOtp` does not set it).
   */
  $requestLoginOtp(model: OtpRequestModel): Observable<IResponse<TUserKey>> {
    return this.$post<TUserKey>(this.endpoints.requestLoginOtp, model, 'requestLoginOtp');
  }

  /**
   * Checks the code. On success the returned token is stored like a `$login`
   * token, so the session stream and the `AUTH` header pick it up.
   */
  $loginWithOtp(model: OtpResponseModel<TUserKey>): Observable<IResponse<LoginData>> {
    return this.$post<LoginData>(this.endpoints.loginWithOtp, model, 'loginWithOtp').pipe(
      tap((result) => {
        const token = result.data?.token;
        if (result.statusCode === StatusCode.Succeeded && token) {
          this.auth.setToken(token);
        }
      }),
    );
  }

  /**
   * Asks the host to send a verification code to an existing user. `data` is the
   * user key, when the host returns it (Identity's `RequestRegisterOtp` does not set it).
   */
  $requestRegisterOtp(model: OtpRequestModel): Observable<IResponse<TUserKey>> {
    return this.$post<TUserKey>(this.endpoints.requestRegisterOtp, model, 'requestRegisterOtp');
  }

  $registerWithOtp(model: OtpResponseModel<TUserKey>): Observable<IResponse<boolean>> {
    return this.$post<boolean>(this.endpoints.registerWithOtp, model, 'registerWithOtp');
  }

  /** Asks the host to send a reset code. `data` is the user key to send back with the code. */
  $requestResetPassword(model: ResetPasswordRequestModel): Observable<IResponse<TUserKey>> {
    return this.$post<TUserKey>(this.endpoints.requestResetPassword, model, 'requestResetPassword');
  }

  $resetPassword(model: ResetPasswordModel<TUserKey>): Observable<IResponse<boolean>> {
    return this.$post<boolean>(this.endpoints.resetPassword, model, 'resetPassword');
  }

  private $post<T>(template: string, data: unknown, operation: ClientOperation): Observable<IResponse<T>> {
    return this.$send<T>(
      this.buildPath(template),
      { method: 'POST', data, ...this.anonymous() },
      operation,
    );
  }
}
