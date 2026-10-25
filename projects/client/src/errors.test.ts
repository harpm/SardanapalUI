import { describe, expect, it } from 'vitest';
import { SardanapalErrorChannel, SardanapalHttpError } from './index';

describe('error channel', () => {
  it('publishes a reported error and returns the same instance', () => {
    const channel = new SardanapalErrorChannel();
    const seen: SardanapalHttpError[] = [];
    channel.error$.subscribe((error) => seen.push(error));
    const error = new SardanapalHttpError('boom', 500, { message: 'x' });

    const returned = channel.report(error);

    expect(returned).toBe(error);
    expect(seen).toEqual([error]);
  });

  it('ignores a second report of the same instance but publishes a new one', () => {
    const channel = new SardanapalErrorChannel();
    const seen: SardanapalHttpError[] = [];
    channel.error$.subscribe((error) => seen.push(error));
    const first = new SardanapalHttpError('a', 500, null);

    channel.report(first);
    channel.report(first);
    channel.report(new SardanapalHttpError('a', 500, null));

    expect(seen).toHaveLength(2);
  });

  it('delivers to every subscriber and does not replay old errors', () => {
    const channel = new SardanapalErrorChannel();
    const one: SardanapalHttpError[] = [];
    const two: SardanapalHttpError[] = [];
    channel.error$.subscribe((error) => one.push(error));
    channel.report(new SardanapalHttpError('before', 500, null));
    channel.error$.subscribe((error) => two.push(error));

    channel.report(new SardanapalHttpError('after', 500, null));

    expect(one.map((error) => error.message)).toEqual(['before', 'after']);
    expect(two.map((error) => error.message)).toEqual(['after']);
  });

  it('keeps the optional resource and operation settable', () => {
    const error = new SardanapalHttpError('boom', 500, null);

    expect(error.resource).toBeUndefined();
    error.resource = 'orders';
    error.operation = 'getAll';

    expect(error).toMatchObject({ resource: 'orders', operation: 'getAll', name: 'SardanapalHttpError' });
  });
});
