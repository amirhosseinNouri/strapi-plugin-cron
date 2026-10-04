import type { Core } from '@strapi/strapi';
import type { AdminUserSummary } from '../../../types';
import { PLUGIN_ID } from '../../../utils/plugin';

/**
 * Every audit event is emitted on Strapi's event hub as
 * `strapi-plugin-cron.cron-job.<action>` so any audit plugin can subscribe
 * (e.g. prima-audit with `eventSubscriptions: ['strapi-plugin-cron.*']`).
 */
export const AUDIT_EVENT_PREFIX = `${PLUGIN_ID}.cron-job`;

export const AUDIT_ACTIONS = [
  'create',
  'update',
  'delete',
  'publish',
  'unpublish',
  'trigger',
  'run.succeeded',
  'run.failed',
  'blocked',
  'warnings-acknowledged',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type AuditEntity = {
  type: 'cron-job';
  uid: string;
  id: string | null;
  displayName: string | null;
};

export type AuditEventPayload = {
  action: AuditAction;
  user: AdminUserSummary | null;
  entity: AuditEntity;
  ipAddress: string | null;
  timestamp: string;
  details: Record<string, unknown>;
};

export type RequestContext = {
  user: AdminUserSummary | null;
  ipAddress: string | null;
};

export const toUserSummary = (user: any): AdminUserSummary | null => {
  if (!user || user.id === undefined || user.id === null) return null;
  return {
    id: user.id,
    documentId: user.documentId,
    firstname: user.firstname ?? null,
    lastname: user.lastname ?? null,
    username: user.username ?? null,
    email: user.email ?? null,
  };
};

export const requestContext = (ctx: any): RequestContext => ({
  user: toUserSummary(ctx?.state?.user),
  ipAddress: ctx?.request?.ip ?? ctx?.ip ?? null,
});

export const SYSTEM_CONTEXT: RequestContext = { user: null, ipAddress: null };

export const eventName = (action: AuditAction) => `${AUDIT_EVENT_PREFIX}.${action}`;

/**
 * Emits an audit event. Never throws: a failing subscriber must not break
 * the cron job operation that triggered it.
 */
export const emitAuditEvent = async (
  strapi: Core.Strapi,
  action: AuditAction,
  {
    context,
    cronJob,
    details = {},
  }: {
    context: RequestContext;
    cronJob: { documentId?: string | null; name?: string | null } | null;
    details?: Record<string, unknown>;
  }
): Promise<void> => {
  const payload: AuditEventPayload = {
    action,
    user: context.user,
    entity: {
      type: 'cron-job',
      uid: `plugin::${PLUGIN_ID}.cron-job`,
      id: cronJob?.documentId ?? null,
      displayName: cronJob?.name ?? null,
    },
    ipAddress: context.ipAddress,
    timestamp: new Date().toISOString(),
    details,
  };
  try {
    await strapi.eventHub.emit(eventName(action), payload);
  } catch (error) {
    strapi.log.error(`[${PLUGIN_ID}] audit event subscriber failed for ${eventName(action)}`, error);
  }
};
