import axios, { AxiosHeaders, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { SardanapalHttpClient, SardanapalHttpError } from '@sardanapal/client';
import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';
import {
  SardanapalAccountClient,
  SardanapalAuthService,
  SardanapalOtpAccountClient,
} from './index';

const baseUrl = 'http://localhost:5000';

interface MockResult {
  data: unknown;
  status?: number;
}

type Reply = (url: string, config: InternalAxiosRequestConfig) => MockResult;

class AccountTestKit {
  readonly calls: InternalAxiosRequestConfig[] = [];
  readonly http: SardanapalHttpClient;
  readonly auth: SardanapalAuthService;
  reply: Reply = () => ({ data: AccountTestKit.envelope(true) });

  constructor() {
    const adapter: AxiosAdapter = async (config) => {
      this.calls.push(config);
      const result = this.reply(axios.getUri(config), config);
      const status = result.status ?? 200;
      return {
        data: result.data,
        status,
        statusText: status >= 200 && status < 300 ? 'OK' : 'Error',
        headers: AxiosHeaders.from({}),
        config,
      };
    };
    this.http = new SardanapalHttpClient({ apiBaseUrl: baseUrl, adapter });
    this.auth = new SardanapalAuthService({ client: this.http });
  }

  get last(): InternalAxiosRequestConfig {
    const call = this.calls[this.calls.length - 1];
    if (!call) {
      throw new Error('No request was sent.');
    }
    return call;
  }

  url(): string {
    return axios.getUri(this.last);
  }

  body(): unknown {
    const data = this.last.data;
    return typeof data === 'string' ? JSON.parse(data) : data;
  }

  authHeader(): string | null {
    const raw = AxiosHeaders.from(this.last.headers).get('AUTH');
    return typeof raw === 'string' ? raw : null;
  }

  /** Caches a token so calls would carry `AUTH` unless they are anonymous. */
  signIn(claims: Record<string, unknown> = {}): string {
    const token = AccountTestKit.jwt({ id: '7', exp: AccountTestKit.farExp(), ...claims });
    this.auth.setToken(token);
    return token;
  }

  static jwt(payload: Record<string, unknown>): string {
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
    return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.sig`;
  }

  static farExp(): number {
    return Math.floor(Date.now() / 1000) + 3 * 60 * 60;
  }

  static envelope<T>(data: T | undefined, statusCode = 0, userMessage = '') {
    return {
      isSuccess: statusCode === 0,
      serviceName: 'AccountService',
      operationType: 4,
      statusCode,
      developerMessages: [],
      userMessage,
      data,
    };
  }
}

describe('SardanapalAuthService.setToken', () => {
  it('stores the token, publishes the session, and sends AUTH afterwards', async () => {
    const kit = new AccountTestKit();
    const seen: Array<string | null> = [];
    kit.auth.session$.subscribe((session) => seen.push(session.token));

    const token = kit.signIn();
    await firstValueFrom(kit.auth.$request('/orders'));

    expect(seen).toEqual([null, token]);
    expect(kit.auth.getSession().claims?.id).toBe('7');
    expect(kit.authHeader()).toBe(token);
  });

  it('rejects a blank token', () => {
    const kit = new AccountTestKit();

    expect(() => kit.auth.setToken('  ')).toThrow('token is required.');
    expect(kit.auth.getSession().token).toBeNull();
  });
});

describe('SardanapalAccountClient', () => {
  it('requires an auth service', () => {
    expect(() => new SardanapalAccountClient({} as never)).toThrow('auth is required.');
  });

  it('registers with a POST and returns the body as received', async () => {
    const kit = new AccountTestKit();
    kit.reply = () => ({ data: AccountTestKit.envelope(12) });
    const account = new SardanapalAccountClient({ auth: kit.auth });
    const model = { username: 'ada', password: 'secret', roles: [1, 2] };

    const result = await firstValueFrom(account.$register(model));

    expect(kit.last.method).toBe('post');
    expect(kit.url()).toBe(`${baseUrl}/account/register`);
    expect(kit.body()).toEqual(model);
    expect(result).toEqual(AccountTestKit.envelope(12));
  });

  it('sends AUTH on register, getEditable, edit, delete and changeUserPassword', async () => {
    const kit = new AccountTestKit();
    const token = kit.signIn();
    const account = new SardanapalAccountClient({ auth: kit.auth });
    const editable = { username: 'ada', password: 'x', roles: [1], claims: [3] };

    const calls = [
      () => account.$register({ username: 'a', password: 'b', roles: [] }),
      () => account.$getEditable(7),
      () => account.$edit(7, editable),
      () => account.$delete(7),
      () => account.$changeUserPassword({ userId: 7, newPassword: 'n' }),
    ];
    for (const call of calls) {
      await firstValueFrom(call());
      expect(kit.authHeader()).toBe(token);
    }
  });

  it('gets the editable user with a GET and the key in the path', async () => {
    const kit = new AccountTestKit();
    const editable = { username: 'ada', password: '', roles: [1], claims: [] };
    kit.reply = () => ({ data: AccountTestKit.envelope(editable) });
    const account = new SardanapalAccountClient({ auth: kit.auth });

    const result = await firstValueFrom(account.$getEditable(7));

    expect(kit.last.method).toBe('get');
    expect(kit.url()).toBe(`${baseUrl}/account/get-editable/7`);
    expect(result.data).toEqual(editable);
  });

  it('edits with a PUT and deletes with a DELETE', async () => {
    const kit = new AccountTestKit();
    const account = new SardanapalAccountClient({ auth: kit.auth });
    const editable = { username: 'ada', password: 'x', roles: [1], claims: [3] };

    await firstValueFrom(account.$edit(7, editable));
    expect(kit.last.method).toBe('put');
    expect(kit.url()).toBe(`${baseUrl}/account/7`);
    expect(kit.body()).toEqual(editable);

    await firstValueFrom(account.$delete(7));
    expect(kit.last.method).toBe('delete');
    expect(kit.url()).toBe(`${baseUrl}/account/7`);
  });

  it('requires a key when the path has an id', () => {
    const kit = new AccountTestKit();
    const account = new SardanapalAccountClient<string>({ auth: kit.auth });

    expect(() => account.$delete('')).toThrow('id is required.');
    expect(kit.calls).toHaveLength(0);
  });

  it('encodes a string key in the path', async () => {
    const kit = new AccountTestKit();
    const account = new SardanapalAccountClient<string>({ auth: kit.auth });

    await firstValueFrom(account.$delete('a/b c'));

    expect(kit.url()).toBe(`${baseUrl}/account/a%2Fb%20c`);
  });

  it('changes the password with the old one, without the AUTH header', async () => {
    const kit = new AccountTestKit();
    kit.signIn({ must_change_pw: 'true' });
    const account = new SardanapalAccountClient({ auth: kit.auth });
    const model = { username: 'ada', oldPassword: 'old', newPassword: 'new' };

    const result = await firstValueFrom(account.$changePassword(model));

    expect(kit.last.method).toBe('post');
    expect(kit.url()).toBe(`${baseUrl}/account/change-password`);
    expect(kit.body()).toEqual(model);
    expect(kit.authHeader()).toBeNull();
    expect(result.isSuccess).toBe(true);
  });

  it('changes a password by user id with the key and new password', async () => {
    const kit = new AccountTestKit();
    const account = new SardanapalAccountClient({ auth: kit.auth });

    await firstValueFrom(account.$changeUserPassword({ userId: 7, newPassword: 'n' }));

    expect(kit.url()).toBe(`${baseUrl}/account/change-user-password`);
    expect(kit.body()).toEqual({ userId: 7, newPassword: 'n' });
  });

  it('overrides endpoints and ignores blank overrides', async () => {
    const kit = new AccountTestKit();
    const account = new SardanapalAccountClient({
      auth: kit.auth,
      endpoints: { delete: 'users/{id}/remove', register: '  ', edit: undefined },
    });

    await firstValueFrom(account.$delete(5));
    expect(kit.url()).toBe(`${baseUrl}/users/5/remove`);

    await firstValueFrom(account.$register({ username: 'a', password: 'b', roles: [] }));
    expect(kit.url()).toBe(`${baseUrl}/account/register`);

    await firstValueFrom(account.$edit(5, { username: 'a', password: 'b', roles: [], claims: [] }));
    expect(kit.url()).toBe(`${baseUrl}/account/5`);
  });

  it('returns a failure envelope inside a 2xx body without throwing', async () => {
    const kit = new AccountTestKit();
    kit.reply = () => ({ data: AccountTestKit.envelope(undefined, 1, 'Wrong password.') });
    const account = new SardanapalAccountClient({ auth: kit.auth });
    const errors: SardanapalHttpError[] = [];
    kit.http.httpError$.subscribe((error) => errors.push(error));

    const result = await firstValueFrom(
      account.$changePassword({ username: 'ada', oldPassword: 'x', newPassword: 'y' }),
    );

    expect(result).toMatchObject({ isSuccess: false, statusCode: 1, userMessage: 'Wrong password.' });
    expect(errors).toHaveLength(0);
  });

  it('rejects a non-2xx response with one reported SardanapalHttpError', async () => {
    const kit = new AccountTestKit();
    kit.reply = () => ({ data: { message: 'boom' }, status: 500 });
    const account = new SardanapalAccountClient({ auth: kit.auth });
    const errors: SardanapalHttpError[] = [];
    kit.http.httpError$.subscribe((error) => errors.push(error));

    const error = await firstValueFrom(account.$delete(7)).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(SardanapalHttpError);
    expect(error).toMatchObject({ status: 500, body: { message: 'boom' } });
    expect(errors).toEqual([error]);
  });

  it('clears the token on a 401, like any other call', async () => {
    const kit = new AccountTestKit();
    kit.signIn();
    kit.reply = () => ({ data: {}, status: 401 });
    const account = new SardanapalAccountClient({ auth: kit.auth });

    await firstValueFrom(account.$delete(7)).catch(() => undefined);

    expect(kit.auth.getSession().token).toBeNull();
  });
});

describe('SardanapalOtpAccountClient', () => {
  const requestModel = { phoneNumber: 9120000000, role: 1 };
  const responseModel = { userId: 7, roleId: 1, code: '1234' };

  it('extends the account client', async () => {
    const kit = new AccountTestKit();
    const otp = new SardanapalOtpAccountClient({ auth: kit.auth });

    await firstValueFrom(otp.$delete(7));

    expect(otp).toBeInstanceOf(SardanapalAccountClient);
    expect(kit.last.method).toBe('delete');
    expect(kit.url()).toBe(`${baseUrl}/account/7`);
  });

  it.each([
    ['$requestLoginOtp', 'account/request-login-otp', requestModel],
    ['$loginWithOtp', 'account/login-with-otp', responseModel],
    ['$requestRegisterOtp', 'account/request-register-otp', requestModel],
    ['$registerWithOtp', 'account/register-with-otp', responseModel],
    ['$requestResetPassword', 'account/request-reset-password', { email: 'a@b.c' }],
    [
      '$resetPassword',
      'account/reset-password',
      { userId: 7, roleId: 1, code: '1234', newPassword: 'n' },
    ],
  ] as const)('%s posts to %s anonymously', async (method, path, model) => {
    const kit = new AccountTestKit();
    kit.signIn();
    const otp = new SardanapalOtpAccountClient({ auth: kit.auth });

    await firstValueFrom((otp[method] as (model: unknown) => ReturnType<typeof otp.$delete>)(model));

    expect(kit.last.method).toBe('post');
    expect(kit.url()).toBe(`${baseUrl}/${path}`);
    expect(kit.body()).toEqual(model);
    expect(kit.authHeader()).toBeNull();
  });

  it('returns the user key from a login code request', async () => {
    const kit = new AccountTestKit();
    kit.reply = () => ({ data: AccountTestKit.envelope(7) });
    const otp = new SardanapalOtpAccountClient({ auth: kit.auth });

    const result = await firstValueFrom(otp.$requestLoginOtp(requestModel));

    expect(result.data).toBe(7);
  });

  it('stores the token from a successful OTP login', async () => {
    const kit = new AccountTestKit();
    const token = AccountTestKit.jwt({ id: '7', exp: AccountTestKit.farExp() });
    kit.reply = () => ({ data: AccountTestKit.envelope({ token }) });
    const otp = new SardanapalOtpAccountClient({ auth: kit.auth });
    const seen: Array<string | null> = [];
    kit.auth.session$.subscribe((session) => seen.push(session.token));

    const result = await firstValueFrom(otp.$loginWithOtp(responseModel));
    await firstValueFrom(kit.auth.$request('/orders'));

    expect(result.data?.token).toBe(token);
    expect(seen).toEqual([null, token]);
    expect(kit.authHeader()).toBe(token);
  });

  it('keeps the existing token when the OTP login fails', async () => {
    const kit = new AccountTestKit();
    const existing = kit.signIn();
    kit.reply = () => ({ data: AccountTestKit.envelope(undefined, 1, 'Wrong code.') });
    const otp = new SardanapalOtpAccountClient({ auth: kit.auth });

    const result = await firstValueFrom(otp.$loginWithOtp(responseModel));

    expect(result).toMatchObject({ isSuccess: false, userMessage: 'Wrong code.' });
    expect(kit.auth.getSession().token).toBe(existing);
  });

  it('does not store a token when a success body carries none', async () => {
    const kit = new AccountTestKit();
    kit.reply = () => ({ data: AccountTestKit.envelope({ token: '' }) });
    const otp = new SardanapalOtpAccountClient({ auth: kit.auth });

    await firstValueFrom(otp.$loginWithOtp(responseModel));

    expect(kit.auth.getSession().token).toBeNull();
  });

  it('overrides OTP and account endpoints together', async () => {
    const kit = new AccountTestKit();
    const otp = new SardanapalOtpAccountClient({
      auth: kit.auth,
      endpoints: { loginWithOtp: 'otp/login', delete: 'users/{id}' },
    });

    await firstValueFrom(otp.$loginWithOtp(responseModel));
    expect(kit.url()).toBe(`${baseUrl}/otp/login`);

    await firstValueFrom(otp.$delete(3));
    expect(kit.url()).toBe(`${baseUrl}/users/3`);

    await firstValueFrom(otp.$resetPassword({ userId: 7, roleId: 1, code: 'c', newPassword: 'n' }));
    expect(kit.url()).toBe(`${baseUrl}/account/reset-password`);
  });

  it('rejects a non-2xx OTP response with one reported error', async () => {
    const kit = new AccountTestKit();
    kit.reply = () => ({ data: { message: 'down' }, status: 503 });
    const otp = new SardanapalOtpAccountClient({ auth: kit.auth });
    const errors: SardanapalHttpError[] = [];
    kit.http.httpError$.subscribe((error) => errors.push(error));

    const error = await firstValueFrom(otp.$loginWithOtp(responseModel)).catch((caught: unknown) => caught);

    expect(error).toMatchObject({ status: 503 });
    expect(errors).toEqual([error]);
  });
});
