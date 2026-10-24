import { AxiosHeaders, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';
import {
  OperationType,
  Response,
  SardanapalHttpClient,
  SardanapalHttpError,
  StatusCode,
  browserStorage,
  memoryStorage,
} from './index';

const baseUrl = 'http://localhost:5000';

describe('http client', () => {
  it('requires an apiBaseUrl', () => {
    expect(() => new SardanapalHttpClient({ apiBaseUrl: ' ' })).toThrow('apiBaseUrl is required.');
  });

  it('resolves relative paths against the base url and keeps absolute urls', () => {
    const client = new SardanapalHttpClient({ apiBaseUrl: `${baseUrl}/api/` });

    expect(client.resolveUrl('/orders')).toBe(`${baseUrl}/api/orders`);
    expect(client.resolveUrl('orders')).toBe(`${baseUrl}/api/orders`);
    expect(client.resolveUrl('https://other.example/x')).toBe('https://other.example/x');
  });

  it('returns the response body of a successful call', async () => {
    const client = createClient(() => ({ data: { ok: true } }));

    expect(await firstValueFrom(client.$request('/orders'))).toEqual({ ok: true });
  });

  it('rejects non-2xx responses and reports them on httpError$', async () => {
    const client = createClient(() => ({ data: { message: 'boom' }, status: 500 }));
    const reported: SardanapalHttpError[] = [];
    client.httpError$.subscribe((error) => reported.push(error));

    await expect(firstValueFrom(client.$request('/orders'))).rejects.toMatchObject({
      status: 500,
      body: { message: 'boom' },
    });

    expect(reported).toHaveLength(1);
    expect(reported[0]).toBeInstanceOf(SardanapalHttpError);
  });

  it('wraps transport failures in SardanapalHttpError with status 0', async () => {
    const client = createClient(() => {
      throw new Error('network down');
    });

    await expect(firstValueFrom(client.$request('/orders'))).rejects.toMatchObject({
      name: 'SardanapalHttpError',
      status: 0,
      message: 'network down',
    });
  });

  it('runs interceptors in order, request before send and response before the status check', async () => {
    const order: string[] = [];
    const client = createClient((config) => {
      order.push(`send:${new AxiosHeaders(config.headers).get('X-Test')}`);
      return { data: {}, status: 418 };
    });
    client.use({
      request: async (config) => {
        order.push('request:first');
        config.headers.set('X-Test', 'one');
      },
      response: (response) => order.push(`response:first:${response.status}`),
    });
    client.use({
      request: () => {
        order.push('request:second');
      },
      response: () => order.push('response:second'),
    });

    await expect(firstValueFrom(client.$request('/orders'))).rejects.toMatchObject({ status: 418 });

    expect(order).toEqual([
      'request:first',
      'request:second',
      'send:one',
      'response:first:418',
      'response:second',
    ]);
  });

  it('lets a response interceptor replace the error', async () => {
    const client = createClient(() => ({ data: null, status: 401 }));
    client.use({
      response: (response) => {
        if (response.status === 401) {
          throw client.reportHttpError(new SardanapalHttpError('Unauthorized', 401, response.data));
        }
      },
    });

    await expect(firstValueFrom(client.$request('/orders'))).rejects.toMatchObject({ message: 'Unauthorized' });
  });
});

describe('response envelope', () => {
  it('reads a success envelope', () => {
    const result = Response.from<{ id: number }>({
      isSuccess: true,
      serviceName: 'OrderService',
      operationType: OperationType.Fetch,
      statusCode: StatusCode.Succeeded,
      developerMessages: [],
      userMessage: '',
      data: { id: 3 },
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data).toEqual({ id: 3 });
  });

  it('treats any other status code as failure', () => {
    const result = Response.from({ statusCode: StatusCode.Duplicate, userMessage: 'exists' });

    expect(result.isSuccess).toBe(false);
    expect(Object.getOwnPropertyDescriptor(Response.prototype, 'isSuccess')?.set).toBeUndefined();
    expect(result.userMessage).toBe('exists');
  });

  it('rejects bodies that are not envelopes', () => {
    expect(() => Response.from('<html></html>')).toThrow('Response is not an IResponse envelope.');
    expect(() => Response.from(null)).toThrow();
    expect(() => Response.from([])).toThrow();
  });
});

describe('storage', () => {
  it('memory storage keeps values per instance', () => {
    const first = memoryStorage();
    const second = memoryStorage();
    first.set('k', 'v');

    expect(first.get('k')).toBe('v');
    expect(second.get('k')).toBeNull();
    first.remove('k');
    expect(first.get('k')).toBeNull();
  });

  it('browser storage adapts a Storage-like object', () => {
    const values = new Map<string, string>();
    const storage = browserStorage({
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    });

    storage.set('k', 'v');
    expect(storage.get('k')).toBe('v');
    storage.remove('k');
    expect(values.size).toBe(0);
  });
});

function createClient(
  handler: (config: InternalAxiosRequestConfig) => { data: unknown; status?: number },
): SardanapalHttpClient {
  const adapter: AxiosAdapter = async (config) => {
    const result = handler(config);
    return {
      data: result.data,
      status: result.status ?? 200,
      statusText: result.status && result.status >= 400 ? 'Error' : 'OK',
      headers: AxiosHeaders.from({}),
      config,
    };
  };
  return new SardanapalHttpClient({ apiBaseUrl: baseUrl, adapter });
}