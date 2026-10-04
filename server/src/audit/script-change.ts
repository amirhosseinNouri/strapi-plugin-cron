import { createHash } from 'crypto';
import { createTwoFilesPatch } from 'diff';

/** Unified diffs larger than this are dropped from audit details; hashes are always kept. */
export const MAX_DIFF_BYTES = 64 * 1024;

export const hashScript = (script: string | null | undefined): string | null =>
  typeof script === 'string' ? createHash('sha256').update(script, 'utf8').digest('hex') : null;

export type ScriptChange = {
  scriptHashBefore: string | null;
  scriptHashAfter: string | null;
  diff?: string;
  diffOmitted?: 'too-large';
};

export const describeScriptChange = (
  before: string | null | undefined,
  after: string | null | undefined
): ScriptChange | null => {
  if ((before ?? null) === (after ?? null)) return null;
  const change: ScriptChange = {
    scriptHashBefore: hashScript(before),
    scriptHashAfter: hashScript(after),
  };
  const diff = createTwoFilesPatch('script', 'script', before ?? '', after ?? '', 'before', 'after', {
    context: 3,
  });
  if (Buffer.byteLength(diff, 'utf8') > MAX_DIFF_BYTES) {
    change.diffOmitted = 'too-large';
  } else {
    change.diff = diff;
  }
  return change;
};

const normalize = (value: unknown) => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value)) && /\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value).toISOString();
  }
  return value ?? null;
};

export const changedFields = <T extends Record<string, unknown>>(
  before: Partial<T> | null | undefined,
  after: Partial<T>,
  fields: Array<keyof T>
): Array<keyof T> =>
  fields.filter(
    (field) => field in after && normalize(before?.[field]) !== normalize(after[field])
  );
