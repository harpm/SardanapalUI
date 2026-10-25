import { describe, expect, it } from 'vitest';
import {
  MemoryStorage,
  SardanapalDirectionService,
  type DirectionTarget,
  type TextDirection,
} from './index';

class FakeTarget implements DirectionTarget {
  readonly documentElement = { dir: '' };
}

class DirectionTestKit {
  readonly storage = new MemoryStorage();
  readonly target = new FakeTarget();

  create(defaultDirection?: TextDirection): SardanapalDirectionService {
    return new SardanapalDirectionService({
      storage: this.storage,
      target: this.target,
      defaultDirection,
    });
  }
}

describe('SardanapalDirectionService.fromCulture', () => {
  it.each([
    ['fa', 'rtl'],
    ['fa-IR', 'rtl'],
    ['FA-ir', 'rtl'],
    ['ar', 'rtl'],
    ['ar-SA', 'rtl'],
    ['en', 'ltr'],
    ['en-US', 'ltr'],
    ['de', 'ltr'],
    ['', 'ltr'],
  ] as const)('maps %s to %s', (culture, direction) => {
    expect(SardanapalDirectionService.fromCulture(culture)).toBe(direction);
  });
});

describe('SardanapalDirectionService', () => {
  it('starts ltr and applies dir to the target', () => {
    const kit = new DirectionTestKit();

    const service = kit.create();

    expect(service.getDirection()).toBe('ltr');
    expect(kit.target.documentElement.dir).toBe('ltr');
  });

  it('uses the default direction when nothing is saved', () => {
    const kit = new DirectionTestKit();

    const service = kit.create('rtl');

    expect(service.getDirection()).toBe('rtl');
    expect(kit.target.documentElement.dir).toBe('rtl');
  });

  it('applies a new direction to the target', () => {
    const kit = new DirectionTestKit();
    const service = kit.create();

    service.setDirection('rtl');
    expect(kit.target.documentElement.dir).toBe('rtl');

    service.setDirection('ltr');
    expect(kit.target.documentElement.dir).toBe('ltr');
  });

  it('persists the direction and restores it, ignoring the default', () => {
    const kit = new DirectionTestKit();
    kit.create().setDirection('rtl');

    const restored = kit.create('ltr');

    expect(restored.getDirection()).toBe('rtl');
    expect(kit.target.documentElement.dir).toBe('rtl');
  });

  it('ignores an unknown saved value', () => {
    const kit = new DirectionTestKit();
    kit.storage.set('sardanapal.direction', 'sideways');

    expect(kit.create('rtl').getDirection()).toBe('rtl');
  });

  it('emits directionChanged$ only when the direction changes', () => {
    const service = new DirectionTestKit().create();
    const seen: TextDirection[] = [];
    service.directionChanged$.subscribe((direction) => seen.push(direction));

    service.setDirection('ltr');
    service.setDirection('rtl');
    service.setDirection('rtl');
    service.setDirection('ltr');

    expect(seen).toEqual(['rtl', 'ltr']);
  });

  it('does not emit on construction or replay to a late subscriber', () => {
    const kit = new DirectionTestKit();
    const service = kit.create('rtl');
    const seen: TextDirection[] = [];

    service.directionChanged$.subscribe((direction) => seen.push(direction));

    expect(seen).toEqual([]);
    expect(service.getDirection()).toBe('rtl');
  });

  it('delivers the change to every subscriber', () => {
    const service = new DirectionTestKit().create();
    const one: TextDirection[] = [];
    const two: TextDirection[] = [];
    service.directionChanged$.subscribe((direction) => one.push(direction));
    service.directionChanged$.subscribe((direction) => two.push(direction));

    service.setDirection('rtl');

    expect(one).toEqual(['rtl']);
    expect(two).toEqual(['rtl']);
  });

  it('rejects an invalid direction without changing state', () => {
    const kit = new DirectionTestKit();
    const service = kit.create();
    const seen: TextDirection[] = [];
    service.directionChanged$.subscribe((direction) => seen.push(direction));

    expect(() => service.setDirection('up' as TextDirection)).toThrow('Invalid direction: up.');

    expect(service.getDirection()).toBe('ltr');
    expect(kit.target.documentElement.dir).toBe('ltr');
    expect(kit.storage.get('sardanapal.direction')).toBeNull();
    expect(seen).toEqual([]);
  });

  it('works without a target', () => {
    const service = new SardanapalDirectionService({ target: null });

    service.setDirection('rtl');

    expect(service.getDirection()).toBe('rtl');
  });

  it('writes to the global document when none is given', () => {
    const globals = globalThis as { document?: DirectionTarget };
    const previous = globals.document;
    const fake = new FakeTarget();
    globals.document = fake;
    try {
      new SardanapalDirectionService().setDirection('rtl');
      expect(fake.documentElement.dir).toBe('rtl');
    } finally {
      globals.document = previous;
    }
  });
});
