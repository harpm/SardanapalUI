import { AxiosError, AxiosHeaders, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';
import {
  OperationType,
  Response,
  SardanapalErrorChannel,
  SardanapalHttpClient,
  SardanapalHttpError,
  StatusCode,
  BrowserStorageAdapter,
  MemoryStorage,
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

  it('lets a response interceptor replace the error, and reports it once', async () => {
    const client = createClient(() => ({ data: null, status: 401 }));
    const reported: SardanapalHttpError[] = [];
    client.httpError$.subscribe((error) => reported.push(error));
    client.use({
      response: (response) => {
        if (response.status === 401) {
          throw new SardanapalHttpError('Unauthorized', 401, response.data);
        }
      },
    });

    const error = await firstValueFrom(client.$request('/orders')).catch((e: unknown) => e);

    expect(error).toMatchObject({ message: 'Unauthorized', status: 401 });
    expect(reported).toEqual([error]);
  });

  it('reports a request interceptor failure once, as a SardanapalHttpError', async () => {
    const client = createClient(() => ({ data: {} }));
    const reported: SardanapalHttpError[] = [];
    client.httpError$.subscribe((error) => reported.push(error));
    client.use({
      request: () => {
        throw new Error('no token');
      },
    });

    await expect(firstValueFrom(client.$request('/orders'))).rejects.toMatchObject({
      name: 'SardanapalHttpError',
      status: 0,
      message: 'no token',
    });

    expect(reported).toHaveLength(1);
  });

  it('exposes the channel as errors and shares a supplied one between clients', async () => {
    const errors = new SardanapalErrorChannel();
    const first = createClient(() => ({ data: {}, status: 500 }), errors);
    const second = createClient(() => ({ data: {}, status: 404 }), errors);
    const statuses: number[] = [];
    errors.error$.subscribe((error) => statuses.push(error.status));

    await firstValueFrom(first.$request('/a')).catch(() => undefined);
    await firstValueFrom(second.$request('/b')).catch(() => undefined);

    expect(first.errors).toBe(errors);
    expect(first.httpError$).toBe(errors.error$);
    expect(statuses).toEqual([500, 404]);
  });

  it('copies the request errorContext onto the reported error', async () => {
    const client = createClient(() => ({ data: {}, status: 500 }));
    const reported: SardanapalHttpError[] = [];
    client.httpError$.subscribe((error) => reported.push(error));

    await firstValueFrom(client.$request('/orders', { errorContext: { resource: 'orders', operation: 'getAll' } }))
      .catch(() => undefined);
    await firstValueFrom(client.$request('/other')).catch(() => undefined);

    expect(reported[0]).toMatchObject({ resource: 'orders', operation: 'getAll' });
    expect(reported[1].resource).toBeUndefined();
    expect(reported[1].operation).toBeUndefined();
  });

  it('copies the errorContext for transport and request interceptor failures too', async () => {
    const client = createClient((config) => {
      throw new AxiosError('network down', AxiosError.ERR_NETWORK, config);
    });
    const reported: SardanapalHttpError[] = [];
    client.httpError$.subscribe((error) => reported.push(error));
    const context = { errorContext: { resource: 'orders', operation: 'get' as const } };

    await firstValueFrom(client.$request('/orders', context)).catch(() => undefined);
    client.use({
      request: () => {
        throw new Error('no token');
      },
    });
    await firstValueFrom(client.$request('/orders', context)).catch(() => undefined);

    expect(reported).toHaveLength(2);
    expect(reported).toMatchObject([
      { status: 0, message: 'network down', resource: 'orders', operation: 'get' },
      { status: 0, message: 'no token', resource: 'orders', operation: 'get' },
    ]);
  });

  it('decodes a binary error body to JSON before interceptors and callers see it', async () => {
    const bytes = toBuffer(JSON.stringify({ message: 'export failed' }));
    const client = createClient(() => ({ data: bytes, status: 500 }));
    const seenByInterceptor: unknown[] = [];
    client.use({ response: (response) => seenByInterceptor.push(response.data) });
    const reported: SardanapalHttpError[] = [];
    client.httpError$.subscribe((error) => reported.push(error));

    const error = await firstValueFrom(client.$request('/x', { responseType: 'arraybuffer' }))
      .catch((e: unknown) => e);

    expect((error as SardanapalHttpError).body).toEqual({ message: 'export failed' });
    expect(seenByInterceptor).toEqual([{ message: 'export failed' }]);
    expect(reported).toEqual([error]);
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
    const first = new MemoryStorage();
    const second = new MemoryStorage();
    first.set('k', 'v');

    expect(first.get('k')).toBe('v');
    expect(second.get('k')).toBeNull();
    first.remove('k');
    expect(first.get('k')).toBeNull();
  });

  it('browser storage adapts a Storage-like object', () => {
    const values = new Map<string, string>();
    const storage = new BrowserStorageAdapter({
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
  errors?: SardanapalErrorChannel,
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
  return new SardanapalHttpClient({ apiBaseUrl: baseUrl, adapter, errors });
}

function toBuffer(text: string): ArrayBuffer {
  const bytes = new TextEncoder().encode(text);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}