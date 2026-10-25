import { AxiosError, AxiosHeaders, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';
import {
  SardanapalCrudClient,
  SardanapalHttpClient,
  SardanapalHttpError,
  StatusCode,
  createGridSearchModel,
} from './index';

const baseUrl = 'http://localhost:5000';

interface Recorded {
  method?: string;
  url?: string;
  body: unknown;
}

describe('grid search model', () => {
  it('applies the Core defaults', () => {
    expect(createGridSearchModel()).toEqual({
      sortAscending: true,
      pageIndex: 0,
      pageSize: 25,
      totalCount: 0,
    });
  });

  it('keeps overrides and ignores undefined values', () => {
    const model = createGridSearchModel({ pageSize: 0, sortId: 'name', pageIndex: undefined, fields: null });

    expect(model).toMatchObject({ pageSize: 0, sortId: 'name', pageIndex: 0, fields: null });
  });
});

describe('crud client', () => {
  it('requires a client and a resource', () => {
    const { client } = createClient(() => ({ data: {} }));

    expect(() => new SardanapalCrudClient({ client, resource: ' / ' })).toThrow('resource is required.');
    expect(() => new SardanapalCrudClient({ client: undefined as never, resource: 'orders' })).toThrow('client is required.');
  });

  it('$get sends GET {resource}/{id} and returns the body', async () => {
    const { client, calls } = createClient(() => ({ data: succeeded({ id: 7, name: 'a' }) }));
    const crud = new SardanapalCrudClient<number, unknown, { id: number; name: string }>({ client, resource: 'orders' });

    const result = await firstValueFrom(crud.$get(7));

    expect(calls[0]).toMatchObject({ method: 'get', url: 'orders/7' });
    expect(result.isSuccess).toBe(true);
    expect(result.statusCode).toBe(StatusCode.Succeeded);
    expect(result.data).toEqual({ id: 7, name: 'a' });
  });

  it('$getAll posts the full default model when none is given', async () => {
    const { client, calls } = createClient(() => ({ data: succeeded({ list: [], searchModel: {} }) }));
    const crud = new SardanapalCrudClient({ client, resource: 'orders' });

    await firstValueFrom(crud.$getAll());

    expect(calls[0]).toMatchObject({ method: 'post', url: 'orders/get-all' });
    expect(calls[0].body).toEqual({ sortAscending: true, pageIndex: 0, pageSize: 25, totalCount: 0 });
  });

  it('$getAll posts the given search model on top of the defaults', async () => {
    const { client, calls } = createClient(() => ({ data: succeeded({ list: [{ id: 1 }], searchModel: { totalCount: 1 } }) }));
    const crud = new SardanapalCrudClient<number, { name: string }>({ client, resource: 'orders' });

    const result = await firstValueFrom(crud.$getAll({ fields: { name: 'x' }, pageIndex: 2, sortId: 'name' }));

    expect(calls[0].body).toEqual({
      fields: { name: 'x' },
      pageIndex: 2,
      sortId: 'name',
      sortAscending: true,
      pageSize: 25,
      totalCount: 0,
    });
    expect(result.data?.list).toEqual([{ id: 1 }]);
  });

  it('$add posts the new model and returns the new key', async () => {
    const { client, calls } = createClient(() => ({ data: succeeded(42) }));
    const crud = new SardanapalCrudClient<number, unknown, unknown, { title: string }>({ client, resource: 'orders' });

    const result = await firstValueFrom(crud.$add({ title: 'new' }));

    expect(calls[0]).toMatchObject({ method: 'post', url: 'orders/add', body: { title: 'new' } });
    expect(result.data).toBe(42);
  });

  it('$getEditable sends GET {resource}/get-editable/{id}', async () => {
    const { client, calls } = createClient(() => ({ data: succeeded({ title: 't' }) }));
    const crud = new SardanapalCrudClient({ client, resource: 'orders' });

    const result = await firstValueFrom(crud.$getEditable(5));

    expect(calls[0]).toMatchObject({ method: 'get', url: 'orders/get-editable/5' });
    expect(result.data).toEqual({ title: 't' });
  });

  it('$edit sends PUT {resource}/{id} with the editable model', async () => {
    const { client, calls } = createClient(() => ({ data: succeeded(true) }));
    const crud = new SardanapalCrudClient<number, unknown, unknown, unknown, { title: string }>({ client, resource: 'orders' });

    const result = await firstValueFrom(crud.$edit(5, { title: 'changed' }));

    expect(calls[0]).toMatchObject({ method: 'put', url: 'orders/5', body: { title: 'changed' } });
    expect(result.data).toBe(true);
  });

  it('$delete sends DELETE {resource}/{id}', async () => {
    const { client, calls } = createClient(() => ({ data: succeeded(true) }));
    const crud = new SardanapalCrudClient({ client, resource: 'orders' });

    const result = await firstValueFrom(crud.$delete(5));

    expect(calls[0]).toMatchObject({ method: 'delete', url: 'orders/5' });
    expect(result.isSuccess).toBe(true);
  });

  it('URL-encodes ids but not the resource, and trims slashes around the resource', async () => {
    const { client, calls } = createClient(() => ({ data: succeeded({}) }));
    const crud = new SardanapalCrudClient<string>({ client, resource: '/sales/orders/' });

    await firstValueFrom(crud.$get('a b/c?d'));

    expect(calls[0].url).toBe('sales/orders/a%20b%2Fc%3Fd');
  });

  it('rejects an empty id', () => {
    const { client } = createClient(() => ({ data: succeeded({}) }));
    const crud = new SardanapalCrudClient<string>({ client, resource: 'orders' });

    expect(() => crud.$get('')).toThrow('id is required.');
  });

  it('returns a 2xx body as received, including a failure status, without throwing', async () => {
    const { client } = createClient(() => ({
      data: { isSuccess: false, statusCode: StatusCode.Duplicate, userMessage: 'already exists', developerMessages: ['dup'] },
    }));
    const crud = new SardanapalCrudClient<number, unknown, unknown, { title: string }>({ client, resource: 'orders' });

    const result = await firstValueFrom(crud.$add({ title: 'x' }));

    expect(result.isSuccess).toBe(false);
    expect(result).toEqual({
      isSuccess: false,
      statusCode: StatusCode.Duplicate,
      userMessage: 'already exists',
      developerMessages: ['dup'],
    });
  });

  it('rejects non-2xx responses with SardanapalHttpError', async () => {
    const { client } = createClient(() => ({ data: { message: 'boom' }, status: 500 }));
    const crud = new SardanapalCrudClient({ client, resource: 'orders' });

    await expect(firstValueFrom(crud.$delete(1))).rejects.toBeInstanceOf(SardanapalHttpError);
  });

  it('applies endpoint overrides per resource and keeps the other defaults', async () => {
    const { client, calls } = createClient(() => ({ data: succeeded(true) }));
    const orders = new SardanapalCrudClient({
      client,
      resource: 'orders',
      endpoints: { delete: '{resource}/{id}/remove', add: 'api/v2/{resource}/create', edit: '  ', get: undefined },
    });
    const users = new SardanapalCrudClient({ client, resource: 'users' });

    await firstValueFrom(orders.$delete(3));
    await firstValueFrom(orders.$add({}));
    await firstValueFrom(orders.$edit(3, {}));
    await firstValueFrom(orders.$get(3));
    await firstValueFrom(users.$delete(3));

    expect(calls.map((call) => call.url)).toEqual([
      'orders/3/remove',
      'api/v2/orders/create',
      'orders/3',
      'orders/3',
      'users/3',
    ]);
  });

  describe('errors on client.httpError$', () => {
    it('does not report a 2xx body with a failure status', async () => {
      const { client } = createClient(() => ({
        data: { statusCode: StatusCode.Duplicate, userMessage: 'already exists' },
      }));
      const crud = new SardanapalCrudClient<number, unknown, unknown, { title: string }>({ client, resource: 'orders' });
      const errors: SardanapalHttpError[] = [];
      client.httpError$.subscribe((error) => errors.push(error));

      await firstValueFrom(crud.$add({ title: 'x' }));

      expect(errors).toEqual([]);
    });

    it('reports a non-2xx response once, with resource and operation, and still rejects', async () => {
      const { client } = createClient(() => ({ data: { message: 'boom' }, status: 500 }));
      const crud = new SardanapalCrudClient({ client, resource: 'orders' });
      const errors: SardanapalHttpError[] = [];
      client.httpError$.subscribe((error) => errors.push(error));

      const error = await firstValueFrom(crud.$delete(3)).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(SardanapalHttpError);
      expect(errors).toEqual([error]);
      expect(errors[0]).toMatchObject({ status: 500, resource: 'orders', operation: 'delete' });
    });

    it('reports transport failures with the operation', async () => {
      const { client } = createClient(() => {
        throw new Error('network down');
      });
      const crud = new SardanapalCrudClient({ client, resource: 'orders' });
      const errors: SardanapalHttpError[] = [];
      client.httpError$.subscribe((error) => errors.push(error));

      await expect(firstValueFrom(crud.$getAll())).rejects.toMatchObject({ status: 0 });

      expect(errors).toMatchObject([{ operation: 'getAll', message: 'network down', resource: 'orders' }]);
    });

    it('reports every operation under its own name', async () => {
      const { client } = createClient(() => ({ data: {}, status: 500 }));
      const crud = new SardanapalCrudClient<number, unknown, unknown, unknown, unknown>({ client, resource: 'orders' });
      const errors: SardanapalHttpError[] = [];
      client.httpError$.subscribe((error) => errors.push(error));

      for (const call of [
        crud.$get(1),
        crud.$getAll(),
        crud.$add({}),
        crud.$getEditable(1),
        crud.$edit(1, {}),
        crud.$delete(1),
      ]) {
        await firstValueFrom(call).catch(() => undefined);
      }

      expect(errors.map((error) => error.operation)).toEqual([
        'get',
        'getAll',
        'add',
        'getEditable',
        'edit',
        'delete',
      ]);
    });

    it('does not report successful requests', async () => {
      const { client } = createClient(() => ({ data: succeeded(true) }));
      const crud = new SardanapalCrudClient({ client, resource: 'orders' });
      const errors: SardanapalHttpError[] = [];
      client.httpError$.subscribe((error) => errors.push(error));

      await firstValueFrom(crud.$delete(1));

      expect(errors).toEqual([]);
    });

    it('tells clients that share one http client apart by resource', async () => {
      const { client } = createClient(() => ({ data: {}, status: 404 }));
      const orders = new SardanapalCrudClient({ client, resource: 'orders' });
      const users = new SardanapalCrudClient({ client, resource: 'users' });
      const errors: SardanapalHttpError[] = [];
      client.httpError$.subscribe((error) => errors.push(error));

      await firstValueFrom(users.$get(1)).catch(() => undefined);
      await firstValueFrom(orders.$get(1)).catch(() => undefined);

      expect(errors.map((error) => error.resource)).toEqual(['users', 'orders']);
    });
  });

  it('carries headers added by a shared client interceptor', async () => {
    const seen: string[] = [];
    const { client } = createClient((config) => {
      seen.push(String(new AxiosHeaders(config.headers).get('AUTH')));
      return { data: succeeded({}) };
    });
    client.use({
      request: (config) => {
        config.headers.set('AUTH', 'jwt');
      },
    });
    const crud = new SardanapalCrudClient({ client, resource: 'orders' });

    await firstValueFrom(crud.$get(1));

    expect(seen).toEqual(['jwt']);
  });
});

function succeeded<T>(data: T) {
  return { isSuccess: true, statusCode: StatusCode.Succeeded, data };
}

function createClient(
  handler: (config: InternalAxiosRequestConfig) => { data: unknown; status?: number },
): { client: SardanapalHttpClient; calls: Recorded[] } {
  const calls: Recorded[] = [];
  const adapter: AxiosAdapter = async (config) => {
    calls.push({
      method: config.method,
      url: config.url,
      body: typeof config.data === 'string' ? JSON.parse(config.data) : config.data,
    });
    let result: { data: unknown; status?: number };
    try {
      result = handler(config);
    } catch (error) {
      // An adapter rejects with an AxiosError that carries the request config.
      throw new AxiosError(error instanceof Error ? error.message : String(error), AxiosError.ERR_NETWORK, config);
    }
    return {
      data: result.data,
      status: result.status ?? 200,
      statusText: result.status && result.status >= 400 ? 'Error' : 'OK',
      headers: AxiosHeaders.from({}),
      config,
    };
  };
  return { client: new SardanapalHttpClient({ apiBaseUrl: baseUrl, adapter }), calls };
}
