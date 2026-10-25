import type { AxiosRequestConfig } from 'axios';
import type { EntityKey, IResponse } from '@sardanapal/client';
import type { Observable } from 'rxjs';
import type { SardanapalAuthService } from './auth';
import type {
  ChangePasswordModel,
  ChangeUserPasswordModel,
  RegisterModel,
  UserEditableModel,
} from './models';

/**
 * Path templates, one per account method. `{id}` is replaced with the URL-encoded
 * user key. The HTTP verb is fixed per method: register `POST`, getEditable `GET`,
 * edit `PUT`, delete `DELETE`, both change-password calls `POST`.
 */
export interface AccountEndpointMap {
  register: string;
  getEditable: string;
  edit: string;
  delete: string;
  changePassword: string;
  changeUserPassword: string;
}

export const defaultAccountEndpoints: AccountEndpointMap = {
  register: 'account/register',
  getEditable: 'account/get-editable/{id}',
  edit: 'account/{id}',
  delete: 'account/{id}',
  changePassword: 'account/change-password',
  changeUserPassword: 'account/change-user-password',
};

export interface SardanapalAccountClientOptions {
  /** Sends every call, so calls carry the `AUTH` header and share its HTTP client. */
  auth: SardanapalAuthService;
  /** Overrides applied on top of the default endpoint map. */
  endpoints?: Partial<AccountEndpointMap>;
}

/**
 * Calls the host that exposes an Identity `IAccountService`. Like the CRUD client,
 * each method carries the `$` prefix and returns the body exactly as received:
 * check `isSuccess` and show `userMessage` yourself. Non-2xx and transport
 * failures reject with `SardanapalHttpError` and are reported once on `httpError$`.
 *
 * `login` and `refresh` stay on `SardanapalAuthService`.
 */
export class SardanapalAccountClient<
  TUserKey extends EntityKey = number,
  TRegister extends RegisterModel = RegisterModel,
  TEditable extends UserEditableModel = UserEditableModel,
> {
  protected readonly auth: SardanapalAuthService;
  /** Defaults merged with the `endpoints` option. A subclass redeclares this with its wider map type. */
  protected readonly endpoints: AccountEndpointMap;

  /**
   * @param defaults Endpoint map the `endpoints` option is applied on top of.
   *   Subclasses pass their own wider map. Callers normally omit it.
   */
  constructor(
    options: SardanapalAccountClientOptions,
    defaults: AccountEndpointMap = defaultAccountEndpoints,
  ) {
    if (!options.auth) {
      throw new Error('auth is required.');
    }
    this.auth = options.auth;
    this.endpoints = this.mergeEndpoints(defaults, options.endpoints);
  }

  /** Sent with the `AUTH` header when a token is cached, so an admin can register users. */
  $register(model: TRegister): Observable<IResponse<TUserKey>> {
    return this.$send<TUserKey>(this.buildPath(this.endpoints.register), {
      method: 'POST',
      data: model,
    });
  }

  $getEditable(id: TUserKey): Observable<IResponse<TEditable>> {
    return this.$send<TEditable>(this.buildPath(this.endpoints.getEditable, id), {
      method: 'GET',
    });
  }

  $edit(id: TUserKey, model: TEditable): Observable<IResponse<boolean>> {
    return this.$send<boolean>(this.buildPath(this.endpoints.edit, id), {
      method: 'PUT',
      data: model,
    });
  }

  $delete(id: TUserKey): Observable<IResponse<boolean>> {
    return this.$send<boolean>(this.buildPath(this.endpoints.delete, id), {
      method: 'DELETE',
    });
  }

  /**
   * The user proves the old password, so this is sent without the `AUTH` header.
   * That is the call a `must_change_pw` user makes: the host rejects every other
   * authorized call with 403 until the password changes. The cached token still
   * carries `must_change_pw` afterwards, so log in again to get a fresh one.
   */
  $changePassword(model: ChangePasswordModel): Observable<IResponse<boolean>> {
    return this.$send<boolean>(this.buildPath(this.endpoints.changePassword), {
      method: 'POST',
      data: model,
      ...this.anonymous(),
    });
  }

  /** Sets a password for a user id. Sent with the `AUTH` header, for an administrator. */
  $changeUserPassword(model: ChangeUserPasswordModel<TUserKey>): Observable<IResponse<boolean>> {
    return this.$send<boolean>(this.buildPath(this.endpoints.changeUserPassword), {
      method: 'POST',
      data: model,
    });
  }

  /** Sends the request and types the deserialized body as `IResponse<T>`. */
  protected $send<T>(path: string, config: AxiosRequestConfig): Observable<IResponse<T>> {
    return this.auth.$request<IResponse<T>>(path, config);
  }

  /** Request options for a call that needs no token: no `AUTH` header and no refresh first. */
  protected anonymous(): Pick<AxiosRequestConfig, 'skipAuth' | 'skipRefresh'> {
    return { skipAuth: true, skipRefresh: true };
  }

  /**
   * Fills `{id}` in a template with the URL-encoded key. Repeated slashes
   * collapse, but the `//` of an absolute URL is kept.
   */
  protected buildPath(template: string, id?: TUserKey): string {
    let path = template;

    if (path.includes('{id}')) {
      if (id === undefined || id === null || id === '') {
        throw new Error('id is required.');
      }
      path = path.replace(/\{id\}/g, encodeURIComponent(String(id)));
    }

    return path.replace(/(^|[^:])\/{2,}/g, '$1/');
  }

  /** Applies overrides on top of defaults, ignoring `undefined` and blank values. */
  protected mergeEndpoints<TMap extends AccountEndpointMap>(
    defaults: TMap,
    overrides?: Partial<TMap> | null,
  ): TMap {
    const merged = { ...defaults } as Record<string, unknown>;
    if (overrides) {
      for (const [name, value] of Object.entries(overrides)) {
        if (typeof value === 'string' && value.trim()) {
          merged[name] = value.trim();
        }
      }
    }
    return merged as unknown as TMap;
  }
}
