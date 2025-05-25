import { debouncedCallAI } from './AI';
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';

beforeEach(() => {
  global.fetch = vi.fn();
});
afterEach(() => {
  vi.clearAllMocks();
});

describe('debouncedCallAI', () => {
  it('should debounce calls and only call API once for rapid calls', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status_code: 200, output: ['result'] }),
    });
    const p1 = debouncedCallAI('test1');
    const p2 = debouncedCallAI('test2');
    const p3 = debouncedCallAI('test3');
    await new Promise((r) => setTimeout(r, 3100)); // Wait for debounce (3s + buffer)
    const result = await p3;
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({ input: 'test3' }),
      })
    );
    expect(result).toEqual(['result']);
  });

  it('should handle non-200 status_code in response', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status_code: 500, output: [] }),
    });
    const result = await debouncedCallAI('fail');
    expect(result).toEqual([]);
  });

  it('should handle invalid JSON response', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => 'not-json',
    });
    const result = await debouncedCallAI('badjson');
    expect(result).toBeNull();
  });

  it('should handle fetch errors gracefully', async () => {
    global.fetch.mockRejectedValue(new Error('Network error'));
    const result = await debouncedCallAI('error');
    expect(result).toBeUndefined();
  });
});
