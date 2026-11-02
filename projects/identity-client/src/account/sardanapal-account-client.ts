import type {
  ClientOperation,
  EntityKey,
  IResponse,
  SardanapalHttpClient,
  SardanapalRequestOptions,
} from '@harpm/sardanapal-client';
import type { Observable } from 'rxjs';
import { SardanapalAuthService } from '../auth/sardanapal-auth-service';
import type {
  ChangePasswordModel,
  ChangeUserPasswordModel,
  RegisterModel,
  UserEditableModel,
} from '../models/models';

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
  /** The shared HTTP client. The auth interceptor on it attaches the `AUTH` header. */
  client: SardanapalHttpClient;
  /** Used for `setToken` after OTP login. Not used to send requests. */
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
  /** `resource` of the error context on every account and OTP call. */
  static readonly resource = 'account';

  protected readonly client: SardanapalHttpClient;
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
    if (!options.client) {
      throw new Error('client is required.');
    }
    if (!options.auth) {
      throw new Error('auth is required.');
    }
    this.client = options.client;
    this.auth = options.auth;
    this.endpoints = this.mergeEndpoints(defaults, options.endpoints);
  }

  /** Sent with the `AUTH` header when a token is cached, so an admin can register users. */
  $register(model: TRegister): Observable<IResponse<TUserKey>> {
    return this.client.$post<IResponse<TUserKey>>(this.buildPath(this.endpoints.register), {
      body: model,
      ...this.context('register'),
    });
  }

  $getEditable(id: TUserKey): Observable<IResponse<TEditable>> {
    return this.client.$get<IResponse<TEditable>>(
      this.buildPath(this.endpoints.getEditable, id),
      this.context('getEditable'),
    );
  }

  $edit(id: TUserKey, model: TEditable): Observable<IResponse<boolean>> {
    return this.client.$put<IResponse<boolean>>(this.buildPath(this.endpoints.edit, id), {
      body: model,
      ...this.context('edit'),
    });
  }

  $delete(id: TUserKey): Observable<IResponse<boolean>> {
    return this.client.$delete<IResponse<boolean>>(
      this.buildPath(this.endpoints.delete, id),
      this.context('delete'),
    );
  }

  /**
   * The user proves the old password, so this is sent without the `AUTH` header.
   * That is the call a `must_change_pw` user makes: the host rejects every other
   * authorized call with 403 until the password changes. The cached token still
   * carries `must_change_pw` afterwards, so log in again to get a fresh one.
   */
  $changePassword(model: ChangePasswordModel): Observable<IResponse<boolean>> {
    return this.client.$post<IResponse<boolean>>(this.buildPath(this.endpoints.changePassword), {
      body: model,
      ...this.context('changePassword'),
      ...this.anonymous(),
    });
  }

  /** Sets a password for a user id. Sent with the `AUTH` header, for an administrator. */
  $changeUserPassword(model: ChangeUserPasswordModel<TUserKey>): Observable<IResponse<boolean>> {
    return this.client.$post<IResponse<boolean>>(this.buildPath(this.endpoints.changeUserPassword), {
      body: model,
      ...this.context('changeUserPassword'),
    });
  }

  /** Error context for an account call, so a failure on `httpError$` names the operation. */
  protected context(operation: ClientOperation): SardanapalRequestOptions {
    return { errorContext: { resource: SardanapalAccountClient.resource, operation } };
  }

  /** Options for a call that needs no token: no `AUTH` header and no refresh first. */
  protected anonymous(): SardanapalRequestOptions {
    return SardanapalAuthService.anonymous;
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
