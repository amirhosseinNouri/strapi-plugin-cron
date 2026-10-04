export type AdminUserSummary = {
  id: number;
  documentId?: string;
  firstname: string | null;
  lastname: string | null;
  username: string | null;
  email: string | null;
};

export type CronJob = {
  id: number;
  documentId: string;
  name: string;
  schedule: string;
  script: string;
  iterationsLimit: number;
  iterationsCount: number;
  startDate: string;
  endDate: string;
  latestExecutionLog: string[][];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  locale: string | null;
  publicationDate: string | null;
  createdBy?: AdminUserSummary | null;
  updatedBy?: AdminUserSummary | null;
};

export type CronJobInputData = Pick<
  CronJob,
  'name' | 'schedule' | 'script' | 'iterationsLimit' | 'startDate' | 'endDate'
>;

export type CronJobInputErrors = { [K in keyof CronJobInputData]?: string | string[] };

export type SecuritySeverity = 'error' | 'warning';

export type SecurityFinding = {
  ruleId: string;
  severity: SecuritySeverity;
  message: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
};

export type SecurityCheckResult = {
  enabled: boolean;
  passed: boolean;
  errors: number;
  warnings: number;
  findings: SecurityFinding[];
};

export type PluginSettings = {
  securityCheck: boolean;
  syntaxHighlighting: boolean;
};

export type TriggerResult = {
  success: boolean;
  logs: string[][];
  error?: string;
};
