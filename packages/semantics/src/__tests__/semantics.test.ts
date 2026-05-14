import { describe, it, expect } from 'vitest';
import { noop } from '../index.js';

describe('semantics', () => {
  it('noop returns void', () => {
    expect(noop()).toBeUndefined();
  });
});