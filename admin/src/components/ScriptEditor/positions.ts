import type { SecurityFinding } from '../../../../types';

type Doc = { lines: number; line: (n: number) => { from: number; to: number }; length: number };

/** Converts a 1-based line/column into a document offset, clamped to the document. */
export const toOffset = (doc: Doc, line: number, column: number): number => {
  const safeLine = Math.min(Math.max(line, 1), doc.lines);
  const { from, to } = doc.line(safeLine);
  return Math.min(from + Math.max(column - 1, 0), to);
};

export const toDiagnostic = (doc: Doc, finding: SecurityFinding) => {
  const from = toOffset(doc, finding.line, finding.column);
  let to = toOffset(doc, finding.endLine, finding.endColumn);
  if (to <= from) to = Math.min(from + 1, doc.length);
  return {
    from,
    to,
    severity: finding.severity,
    message: finding.message,
    source: finding.ruleId,
  } as const;
};

/** Offset into a plain string for textarea selection. */
export const stringOffset = (text: string, line: number, column: number): number => {
  const lines = text.split('\n');
  const safeLine = Math.min(Math.max(line, 1), lines.length);
  let offset = 0;
  for (let index = 0; index < safeLine - 1; index += 1) offset += lines[index].length + 1;
  return offset + Math.min(Math.max(column - 1, 0), lines[safeLine - 1].length);
};
