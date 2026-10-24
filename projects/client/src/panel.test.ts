import { AxiosHeaders, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';
import {
  SardanapalCrudClient,
  SardanapalHttpClient,
  SardanapalHttpError,
  SardanapalPanelClient,
  StatusCode,
  type SardanapalClientError,
} from './index';

const baseUrl = 'http://localhost:5000';

interface Recorded {
  method?: string;
  url?: string;
  responseType?: string;
  body: unknown;
}

describe('panel client', () => {
  it('is a crud client with the default crud routes', async () => {
    const { client, calls } = createClient(() => ({ data: { statusCode: StatusCode.Succeeded, data: true } }));
    const panel = new SardanapalPanelClient({ client, resource: 'orders' });

    expect(panel).toBeInstanceOf(SardanapalCrudClient);
    await firstValueFrom(panel.$delete(4));

    expect(calls[0]).toMatchObject({ method: 'delete', url: 'orders/4' });
  });

  it('$getDictionary posts the default model when none is given', async () => {
    const options = [{ key: 1, value: 'one' }, { key: 2, value: 'two' }];
    const { client, calls } = createClient(() => ({
      data: { statusCode: StatusCode.Succeeded, data: { list: options, searchModel: { totalCount: 2 } } },
    }));
    const panel = new SardanapalPanelClient({ client, resource: 'orders' });

    const result = await firstValueFrom(panel.$getDictionary());

    expect(calls[0]).toMatchObject({ method: 'post', url: 'orders/dictionary' });
    expect(calls[0].body).toEqual({ sortAscending: true, pageIndex: 0, pageSize: 25, totalCount: 0 });
    expect(result.data?.list).toEqual(options);
  });

  it('$getDictionary posts the given search model', async () => {
    const { client, calls } = createClient(() => ({
      data: { statusCode: StatusCode.Succeeded, data: { list: [], searchModel: {} } },
    }));
    const panel = new SardanapalPanelClient<number, { name: string }>({ client, resource: 'orders' });

    await firstValueFrom(panel.$getDictionary({ fields: { name: 'a' }, pageSize: 0 }));

    expect(calls[0].body).toMatchObject({ fields: { name: 'a' }, pageSize: 0 });
  });

  it('returns the body of $getDictionary as received, including a failure status', async () => {
    const { client } = createClient(() => ({ data: { statusCode: StatusCode.Forbidden, userMessage: 'no' } }));
    const panel = new SardanapalPanelClient({ client, resource: 'orders' });

    const result = await firstValueFrom(panel.$getDictionary());

    expect(result.statusCode).toBe(StatusCode.Forbidden);
    expect(result.userMessage).toBe('no');
  });

  it('$getExcel forces pageSize 0, keeps the search, and returns the bytes', async () => {
    const bytes = new Uint8Array([80, 75, 3, 4]).buffer;
    const { client, calls } = createClient(() => ({ data: bytes }));
    const panel = new SardanapalPanelClient<number, { name: string }>({ client, resource: 'orders' });

    const model = { fields: { name: 'a' }, pageSize: 10, pageIndex: 3 };
    const result = await firstValueFrom(panel.$getExcel(model));

    expect(calls[0]).toMatchObject({ method: 'post', url: 'orders/excel', responseType: 'arraybuffer' });
    expect(calls[0].body).toMatchObject({ fields: { name: 'a' }, pageSize: 0, pageIndex: 3 });
    expect(model.pageSize).toBe(10);
    expect(result).toBe(bytes);
  });

  it('$getExcel returns the bytes untouched and sends defaults without a model', async () => {
    const { client, calls } = createClient(() => ({ data: new ArrayBuffer(2) }));
    const panel = new SardanapalPanelClient({ client, resource: 'orders' });

    const result = await firstValueFrom(panel.$getExcel());

    expect(result).toBeInstanceOf(ArrayBuffer);
    expect(calls[0].body).toEqual({ sortAscending: true, pageIndex: 0, pageSize: 0, totalCount: 0 });
  });

  it('$getExcel can request a blob', async () => {
    const { client, calls } = createClient(() => ({ data: new Blob(['x']) }));
    const panel = new SardanapalPanelClient({ client, resource: 'orders' });

    const result = await firstValueFrom(panel.$getExcel(null, { responseType: 'blob' }));

    expect(calls[0].responseType).toBe('blob');
    expect(result).toBeInstanceOf(Blob);
  });

  it('$getExcel decodes a JSON error body from bytes', async () => {
    const payload = { statusCode: StatusCode.Failed, userMessage: 'export failed' };
    const { client } = createClient(() => ({ data: toBuffer(JSON.stringify(payload)), status: 500 }));
    const reported: SardanapalHttpError[] = [];
    client.httpError$.subscribe((error) => reported.push(error));
    const panel = new SardanapalPanelClient({ client, resource: 'orders' });

    const error = await firstValueFrom(panel.$getExcel()).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(SardanapalHttpError);
    expect(error).toMatchObject({ status: 500, body: payload });
    expect(reported).toHaveLength(1);
  });

  it('$getExcel decodes a text error body from a blob', async () => {
    const { client } = createClient(() => ({ data: new Blob(['gateway down']), status: 502 }));
    const panel = new SardanapalPanelClient({ client, resource: 'orders' });

    await expect(firstValueFrom(panel.$getExcel(null, { responseType: 'blob' }))).rejects.toMatchObject({
      name: 'SardanapalHttpError',
      status: 502,
      body: 'gateway down',
    });
  });

  it('$getExcel passes transport failures through unchanged', async () => {
    const { client } = createClient(() => {
      throw new Error('network down');
    });
    const panel = new SardanapalPanelClient({ client, resource: 'orders' });

    await expect(firstValueFrom(panel.$getExcel())).rejects.toMatchObject({ status: 0, message: 'network down' });
  });

  it('emits a failed $getDictionary request on error$', async () => {
    const { client } = createClient(() => ({ data: { message: 'boom' }, status: 500 }));
    const panel = new SardanapalPanelClient({ client, resource: 'orders' });
    const errors: SardanapalClientError[] = [];
    panel.error$.subscribe((error) => errors.push(error));

    await expect(firstValueFrom(panel.$getDictionary())).rejects.toBeInstanceOf(SardanapalHttpError);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ resource: 'orders', operation: 'getDictionary' });
    expect(errors[0].error).toBeInstanceOf(SardanapalHttpError);
  });

  it('does not emit on error$ for a 2xx body with a failure status', async () => {
    const { client } = createClient(() => ({ data: { statusCode: StatusCode.Forbidden, userMessage: 'no' } }));
    const panel = new SardanapalPanelClient({ client, resource: 'orders' });
    const errors: SardanapalClientError[] = [];
    panel.error$.subscribe((error) => errors.push(error));

    await firstValueFrom(panel.$getDictionary());

    expect(errors).toEqual([]);
  });

  it('emits a failed $getExcel once, with the decoded error', async () => {
    const payload = { statusCode: StatusCode.Failed, userMessage: 'export failed' };
    const { client } = createClient(() => ({ data: toBuffer(JSON.stringify(payload)), status: 500 }));
    const panel = new SardanapalPanelClient({ client, resource: 'orders' });
    const errors: SardanapalClientError[] = [];
    panel.error$.subscribe((error) => errors.push(error));

    await firstValueFrom(panel.$getExcel()).catch(() => undefined);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ resource: 'orders', operation: 'getExcel' });
    expect(errors[0].error).toMatchObject({ status: 500, body: payload });
  });

  it('emits a $getExcel transport failure on error$', async () => {
    const { client } = createClient(() => {
      throw new Error('network down');
    });
    const panel = new SardanapalPanelClient({ client, resource: 'orders' });
    const errors: SardanapalClientError[] = [];
    panel.error$.subscribe((error) => errors.push(error));

    await firstValueFrom(panel.$getExcel()).catch(() => undefined);

    expect(errors).toMatchObject([{ operation: 'getExcel', message: 'network down' }]);
  });

  it('does not emit when $getExcel succeeds', async () => {
    const { client } = createClient(() => ({ data: new ArrayBuffer(1) }));
    const panel = new SardanapalPanelClient({ client, resource: 'orders' });
    const errors: SardanapalClientError[] = [];
    panel.error$.subscribe((error) => errors.push(error));

    await firstValueFrom(panel.$getExcel());

    expect(errors).toEqual([]);
  });

  it('applies panel endpoint overrides and keeps the other defaults', async () => {
    const { client, calls } = createClient(() => ({ data: new ArrayBuffer(0) }));
    const panel = new SardanapalPanelClient({
      client,
      resource: 'orders',
      endpoints: { getExcel: '{resource}/export', getDictionary: undefined, get: 'orders/show/{id}' },
    });

    await firstValueFrom(panel.$getExcel());
    await firstValueFrom(panel.$get(9)).catch(() => undefined);
    await firstValueFrom(panel.$getDictionary()).catch(() => undefined);

    expect(calls.map((call) => call.url)).toEqual(['orders/export', 'orders/show/9', 'orders/dictionary']);
  });
});

function toBuffer(text: string): ArrayBuffer {
  const bytes = new TextEncoder().encode(text);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function createClient(
  handler: (config: InternalAxiosRequestConfig) => { data: unknown; status?: number },
): { client: SardanapalHttpClient; calls: Recorded[] } {
  const calls: Recorded[] = [];
  const adapter: AxiosAdapter = async (config) => {
    calls.push({
      method: config.method,
      url: config.url,
      responseType: config.responseType,
      body: typeof config.data === 'string' ? JSON.parse(config.data) : config.data,
    });
    const result = handler(config);
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
