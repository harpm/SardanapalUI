import axios, { AxiosHeaders, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import {
  SardanapalHttpClient,
  SardanapalHttpError,
  browserStorage,
  memoryStorage,
} from '@sardanapal/client';
import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { SardanapalAuthService, SardanapalJwtService } from './index';

const baseUrl = 'http://localhost:5000';

describe('auth', () => {
  it('stores the token from a successful login and reads string claims', async () => {
    const accessToken = jwt({
      id: '7',
      exp: farExp(),
      sd_roles: '2',
      AccessRight: '4',
      sd_controller_action: 'guid:1',
    });
    const { client, calls } = createClient(async (url, config) => {
      expect(url).toBe(`${baseUrl}/account/login`);
      expect(config.method).toBe('post');
      expect(requestData(config)).toEqual({ username: 'ada', password: 'secret' });
      expect(header(config, 'AUTH')).toBeNull();
      return { data: envelope({ token: accessToken }) };
    });
    const seen: Array<string | null> = [];
    const subscription = client.session$.subscribe((session) => seen.push(session.token));

    const result = await firstValueFrom(client.$login('ada', 'secret'));

    expect(result.userMessage).toBe('');
    expect(result.data?.token).toBe(accessToken);
    expect(client.getSession()).toMatchObject({
      token: accessToken,
      mustChangePassword: false,
      claims: {
        id: '7',
        roles: ['2'],
        accessRights: ['4'],
        controllerActions: ['guid:1'],
      },
    });
    expect(seen).toEqual([null, accessToken]);
    subscription.unsubscribe();
    expect(calls).toHaveLength(1);
  });

  it('reads array claims and must_change_pw', () => {
    const accessToken = jwt({
      id: 15,
      exp: farExp(),
      sd_roles: ['1', '3'],
      AccessRight: ['9', '8'],
      sd_controller_action: ['guid:0', 'guid:2'],
      must_change_pw: 'true',
    });

    expect(new SardanapalJwtService().decode(accessToken)).toMatchObject({
      id: '15',
      roles: ['1', '3'],
      accessRights: ['9', '8'],
      controllerActions: ['guid:0', 'guid:2'],
      mustChangePassword: true,
    });
  });

  it('returns userMessage and does not cache a failed login', async () => {
    const { client } = createClient(async () => ({
      data: envelope(undefined, 1, 'Entered password or username is wrong.'),
    }));

    const httpErrors: SardanapalHttpError[] = [];
    const errors = client.httpError$.subscribe((error) => httpErrors.push(error));

    const result = await firstValueFrom(client.$login('ada', 'wrong'));

    expect(result.isSuccess).toBe(false);
    expect(result.userMessage).toBe('Entered password or username is wrong.');
    expect(client.getSession().token).toBeNull();
    expect(httpErrors).toEqual([]);
    errors.unsubscribe();
  });

  it('sends the raw JWT in AUTH and keeps Authorization off the request', async () => {
    const accessToken = jwt({ id: '7', exp: farExp() });
    const { client } = createClient(async (url, config) => {
      if (url.endsWith('/account/login')) {
        return { data: envelope({ token: accessToken }) };
      }
      expect(header(config, 'AUTH')).toBe(accessToken);
      expect(header(config, 'AUTH')?.startsWith('Bearer ')).toBe(false);
      expect(header(config, 'Authorization')).toBeNull();
      return { data: { ok: true } };
    });
    await firstValueFrom(client.$login('ada', 'secret'));

    await firstValueFrom(client.$request('/orders', {
      headers: { Authorization: 'Bearer ignored' },
    }));
  });

  it('replaces the cached token when the response carries AUTH', async () => {
    const original = jwt({ id: '7', exp: farExp(), sd_roles: '1' });
    const renewed = jwt({ id: '7', exp: farExp(), sd_roles: '2' });
    const { client } = createClient(async (url) => {
      if (url.endsWith('/account/login')) {
        return { data: envelope({ token: original }) };
      }
      return { data: { ok: true }, headers: { AUTH: renewed } };
    });
    await firstValueFrom(client.$login('ada', 'secret'));

    await firstValueFrom(client.$request('/orders'));

    expect(client.getSession().token).toBe(renewed);
    expect(client.getSession().claims?.roles).toEqual(['2']);
  });

  it('clears the token on HTTP 401', async () => {
    const accessToken = jwt({ id: '7', exp: farExp() });
    const { client } = createClient(async (url) => {
      if (url.endsWith('/account/login')) {
        return { data: envelope({ token: accessToken }) };
      }
      return { data: null, status: 401, headers: { AUTH: jwt({ id: '9', exp: farExp() }) } };
    });
    const httpErrors: SardanapalHttpError[] = [];
    const errors = client.httpError$.subscribe((error) => httpErrors.push(error));
    await firstValueFrom(client.$login('ada', 'secret'));

    await expect(firstValueFrom(client.$request('/orders'))).rejects.toMatchObject({ status: 401 });

    expect(client.getSession().token).toBeNull();
    expect(httpErrors).toMatchObject([{ status: 401, message: 'Unauthorized' }]);
    errors.unsubscribe();
  });

  it('keeps the token and surfaces mustChangePassword on the password-change 403', async () => {
    const accessToken = jwt({ id: '7', exp: farExp() });
    const { client } = createClient(async (url) => {
      if (url.endsWith('/account/login')) {
        return { data: envelope({ token: accessToken }) };
      }
      return { data: { message: 'Password change required.' }, status: 403 };
    });
    await firstValueFrom(client.$login('ada', 'secret'));

    const error = await firstValueFrom(client.$request('/orders')).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(SardanapalHttpError);
    expect(error).toMatchObject({ status: 403, mustChangePassword: true, message: 'Password change required.' });
    expect(client.getSession().token).toBe(accessToken);
    expect(client.getSession().mustChangePassword).toBe(true);
  });

  it('reports the password-change 403 once', async () => {
    const accessToken = jwt({ id: '7', exp: farExp() });
    const { client } = createClient(async (url) => {
      if (url.endsWith('/account/login')) {
        return { data: envelope({ token: accessToken }) };
      }
      return { data: { message: 'Password change required.' }, status: 403 };
    });
    const httpErrors: SardanapalHttpError[] = [];
    const errors = client.httpError$.subscribe((error) => httpErrors.push(error));
    await firstValueFrom(client.$login('ada', 'secret'));

    const error = await firstValueFrom(client.$request('/orders')).catch((caught: unknown) => caught);

    expect(httpErrors).toEqual([error]);
    errors.unsubscribe();
  });

  it('clears only the local cache on logout', async () => {
    const accessToken = jwt({ id: '7', exp: farExp() });
    const { client, calls } = createClient(async () => ({ data: envelope({ token: accessToken }) }));
    await firstValueFrom(client.$login('ada', 'secret'));

    client.logout();

    expect(client.getSession()).toEqual({ token: null, claims: null, mustChangePassword: false });
    expect(calls).toHaveLength(1);
  });

  it('shares one in-flight refresh across parallel calls', async () => {
    const original = jwt({ id: '7', exp: nearExp(), sd_roles: '1' });
    const renewed = jwt({ id: '7', exp: farExp(), sd_roles: '1' });
    let refreshCalls = 0;
    let releaseRefresh: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });
    const auths: Array<string | null> = [];
    const { client } = createClient(async (url, config) => {
      if (url.endsWith('/account/login')) {
        return { data: envelope({ token: original }) };
      }
      if (url.endsWith('/account/refresh')) {
        refreshCalls += 1;
        expect(requestData(config)).toEqual({ userId: '7' });
        expect(header(config, 'AUTH')).toBe(original);
        await gate;
        return { data: envelope(renewed) };
      }
      auths.push(header(config, 'AUTH'));
      return { data: { ok: true } };
    }, { refreshUrl: true });
    await firstValueFrom(client.$login('ada', 'secret'));

    const pending = Promise.all([
      firstValueFrom(client.$request('/a')),
      firstValueFrom(client.$request('/b')),
      firstValueFrom(client.$request('/c')),
    ]);
    releaseRefresh();
    await pending;

    expect(refreshCalls).toBe(1);
    expect(auths).toEqual([renewed, renewed, renewed]);
    expect(client.getSession().token).toBe(renewed);
  });

  it('does not refresh when the token is outside the window', async () => {
    const accessToken = jwt({ id: '7', exp: farExp() });
    let refreshCalls = 0;
    const { client } = createClient(async (url) => {
      if (url.endsWith('/account/login')) {
        return { data: envelope({ token: accessToken }) };
      }
      if (url.endsWith('/account/refresh')) {
        refreshCalls += 1;
      }
      return { data: { ok: true } };
    }, { refreshUrl: true });
    await firstValueFrom(client.$login('ada', 'secret'));

    await firstValueFrom(client.$request('/orders'));

    expect(refreshCalls).toBe(0);
  });

  it('does not refresh when refresh is disabled or no refresh URL is set', async () => {
    const accessToken = jwt({ id: '7', exp: nearExp() });
    let refreshCalls = 0;
    const handler = async (url: string) => {
      if (url.endsWith('/account/login')) {
        return { data: envelope({ token: accessToken }) };
      }
      if (url.endsWith('/account/refresh')) {
        refreshCalls += 1;
      }
      return { data: { ok: true } };
    };

    const withoutUrl = createClient(handler);
    await firstValueFrom(withoutUrl.client.$login('ada', 'secret'));
    await firstValueFrom(withoutUrl.client.$request('/orders'));

    const disabled = createClient(handler, { refreshUrl: true, refreshThresholdMinutes: 0 });
    await firstValueFrom(disabled.client.$login('ada', 'secret'));
    await firstValueFrom(disabled.client.$request('/orders'));

    expect(refreshCalls).toBe(0);
    await expect(firstValueFrom(withoutUrl.client.$refresh())).rejects.toThrow('Refresh URL is not configured.');
  });

  it('uses a custom refresh URL', async () => {
    const accessToken = jwt({ id: '7', exp: nearExp() });
    const renewed = jwt({ id: '7', exp: farExp() });
    const urls: string[] = [];
    const { client } = createClient(async (url) => {
      urls.push(url);
      if (url.endsWith('/account/login')) {
        return { data: envelope({ token: accessToken }) };
      }
      return { data: envelope(renewed) };
    }, { refreshUrl: 'https://auth.example/token/refresh' });
    await firstValueFrom(client.$login('ada', 'secret'));

    await firstValueFrom(client.$request('/orders'));

    expect(urls).toContain('https://auth.example/token/refresh');
    expect(client.getSession().token).toBe(renewed);
  });

  it('persists the token through a storage adapter', async () => {
    const accessToken = jwt({ id: '7', exp: farExp() });
    const values = new Map<string, string>();
    const storage = browserStorage({
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    });
    const { client } = createClient(async () => ({ data: envelope({ token: accessToken }) }), {
      tokenStorage: storage,
    });

    await firstValueFrom(client.$login('ada', 'secret'));

    expect([...values.values()]).toEqual([accessToken]);
    client.logout();
    expect([...values.values()]).toEqual([]);
  });

  it('keeps token caches isolated per client', async () => {
    const accessToken = jwt({ id: '7', exp: farExp() });
    const handler = async () => ({ data: envelope({ token: accessToken }) });
    const first = createClient(handler);
    const second = createClient(handler);
    await firstValueFrom(first.client.$login('ada', 'secret'));

    expect(second.client.getSession().token).toBeNull();
  });

  it('adds AUTH to calls made through a shared core client', async () => {
    const accessToken = jwt({ id: '7', exp: farExp() });
    const seen: Array<string | null> = [];
    const adapter: AxiosAdapter = async (config) => {
      const url = axios.getUri(config);
      seen.push(header(config as InternalAxiosRequestConfig, 'AUTH'));
      return {
        data: url.endsWith('/account/login') ? envelope({ token: accessToken }) : { ok: true },
        status: 200,
        statusText: 'OK',
        headers: AxiosHeaders.from({}),
        config,
      };
    };
    const core = new SardanapalHttpClient({ apiBaseUrl: baseUrl, adapter });
    const auth = new SardanapalAuthService({ client: core });
    await firstValueFrom(auth.$login('ada', 'secret'));

    await firstValueFrom(core.$request('/orders'));

    expect(seen).toEqual([null, accessToken]);
  });

  it('requires an apiBaseUrl when no client is supplied', () => {
    expect(() => new SardanapalAuthService({})).toThrow('apiBaseUrl is required.');
  });

  it('uses the supplied memory storage', () => {
    const storage = memoryStorage();
    storage.set('sardanapal.auth.token', 'saved');
    expect(storage.get('sardanapal.auth.token')).toBe('saved');
    storage.remove('sardanapal.auth.token');
    expect(storage.get('sardanapal.auth.token')).toBeNull();
  });
});

function nearExp(): number {
  return Math.floor(Date.now() / 1000) + 5 * 60;
}

function farExp(): number {
  return Math.floor(Date.now() / 1000) + 3 * 60 * 60;
}

function jwt(payload: Record<string, unknown>): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.sig`;
}

function envelope<T>(data: T | undefined, statusCode = 0, userMessage = '') {
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

function requestData(config: InternalAxiosRequestConfig): unknown {
  return typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
}

function header(config: InternalAxiosRequestConfig, name: string): string | null {
  const raw = AxiosHeaders.from(config.headers).get(name);
  return typeof raw === 'string' ? raw : null;
}

function createClient(
  handler: (url: string, config: InternalAxiosRequestConfig) => Promise<MockResult> | MockResult,
  options: {
    refreshUrl?: boolean | string;
    refreshThresholdMinutes?: number;
    tokenStorage?: ReturnType<typeof memoryStorage>;
  } = {},
) {
  const calls: InternalAxiosRequestConfig[] = [];
  const adapter: AxiosAdapter = async (config) => {
    calls.push(config);
    const url = axios.getUri(config);
    const result = await handler(url, config);
    return {
      data: result.data,
      status: result.status ?? 200,
      statusText: result.status === 401 || result.status === 403 ? 'Error' : 'OK',
      headers: AxiosHeaders.from(result.headers ?? {}),
      config,
    };
  };
  const client = new SardanapalAuthService({
    apiBaseUrl: baseUrl,
    adapter,
    ...options,
  });
  return { client, calls };
}

interface MockResult {
  data: unknown;
  status?: number;
  headers?: Record<string, string>;
}
