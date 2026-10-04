import type { SecurityFinding, SecuritySeverity } from '../../../types';

export type AstNode = {
  type: string;
  start: number;
  end: number;
  loc?: { start: { line: number; column: number }; end: { line: number; column: number } };
  [key: string]: any;
};

export type RuleVisitor = Partial<Record<string, (node: AstNode, ancestors: AstNode[]) => void>>;

export type RuleContext = {
  source: string;
  report: (node: AstNode, message?: string) => void;
};

export type SecurityRule = {
  /** Stable identifier, shown to users and stored in audit logs. */
  id: string;
  severity: SecuritySeverity;
  /** One-line summary, used as the default finding message. */
  description: string;
  /** Why the rule exists and what to do instead. Rendered in the README. */
  rationale: string;
  create: (context: RuleContext) => RuleVisitor;
};

export type { SecurityFinding, SecuritySeverity };
