import { changedFields, describeScriptChange, hashScript, MAX_DIFF_BYTES } from '../script-change';

describe('hashScript', () => {
  it('returns a sha256 hex digest for strings', () => {
    expect(hashScript('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
  it('returns null for missing scripts', () => {
    expect(hashScript(null)).toBeNull();
    expect(hashScript(undefined)).toBeNull();
  });
});

describe('describeScriptChange', () => {
  it('returns null when nothing changed', () => {
    expect(describeScriptChange('a', 'a')).toBeNull();
    expect(describeScriptChange(null, undefined)).toBeNull();
  });

  it('includes hashes and a unified diff', () => {
    const change = describeScriptChange('console.log(1)\n', 'console.log(2)\n')!;
    expect(change.scriptHashBefore).toBe(hashScript('console.log(1)\n'));
    expect(change.scriptHashAfter).toBe(hashScript('console.log(2)\n'));
    expect(change.diff).toContain('-console.log(1)');
    expect(change.diff).toContain('+console.log(2)');
    expect(change.diffOmitted).toBeUndefined();
  });

  it('handles a script added from nothing', () => {
    const change = describeScriptChange(null, 'x')!;
    expect(change.scriptHashBefore).toBeNull();
    expect(change.diff).toContain('+x');
  });

  it('drops the diff but keeps hashes when it is too large', () => {
    const big = 'x'.repeat(MAX_DIFF_BYTES + 10);
    const change = describeScriptChange('small', big)!;
    expect(change.diff).toBeUndefined();
    expect(change.diffOmitted).toBe('too-large');
    expect(change.scriptHashAfter).toBe(hashScript(big));
  });
});

describe('changedFields', () => {
  type T = { name: string; startDate: unknown; limit: number; other?: string };
  it('lists only fields present in the update that differ', () => {
    expect(
      changedFields<T>(
        { name: 'a', startDate: '2026-01-01T00:00:00.000Z', limit: 1 },
        { name: 'b', startDate: new Date('2026-01-01T00:00:00.000Z'), limit: 1 },
        ['name', 'startDate', 'limit', 'other']
      )
    ).toEqual(['name']);
  });

  it('treats ISO strings with different formatting as equal dates', () => {
    expect(
      changedFields<T>(
        { startDate: '2026-01-01T00:00:00Z' } as any,
        { startDate: '2026-01-01T00:00:00.000Z' } as any,
        ['startDate']
      )
    ).toEqual([]);
  });

  it('handles a missing previous record', () => {
    expect(changedFields<T>(null, { name: 'a' } as any, ['name'])).toEqual(['name']);
    expect(changedFields<T>(undefined, { other: undefined } as any, ['other'])).toEqual([]);
  });
});
