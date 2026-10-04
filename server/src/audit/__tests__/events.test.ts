import { createMockStrapi } from '../../__tests__/mock-strapi';
import {
  AUDIT_ACTIONS,
  AUDIT_EVENT_PREFIX,
  emitAuditEvent,
  eventName,
  requestContext,
  SYSTEM_CONTEXT,
  toUserSummary,
} from '../events';

describe('audit events', () => {
  it('namespaces events under the plugin id', () => {
    expect(AUDIT_EVENT_PREFIX).toBe('strapi-plugin-cron.cron-job');
    expect(eventName('run.failed')).toBe('strapi-plugin-cron.cron-job.run.failed');
    expect(AUDIT_ACTIONS).toContain('warnings-acknowledged');
  });

  it('summarises admin users without leaking other fields', () => {
    expect(
      toUserSummary({ id: 1, documentId: 'd', firstname: 'A', password: 'secret', roles: [] })
    ).toEqual({ id: 1, documentId: 'd', firstname: 'A', lastname: null, username: null, email: null });
    expect(toUserSummary(null)).toBeNull();
    expect(toUserSummary({})).toBeNull();
  });

  it('builds the request context from koa ctx', () => {
    expect(requestContext({ state: { user: { id: 2 } }, request: { ip: '1.2.3.4' } })).toMatchObject({
      user: { id: 2 },
      ipAddress: '1.2.3.4',
    });
    expect(requestContext({ ip: '5.6.7.8' })).toEqual({ user: null, ipAddress: '5.6.7.8' });
    expect(requestContext(undefined)).toEqual({ user: null, ipAddress: null });
  });

  it('emits a structured payload on the event hub', async () => {
    const { strapi } = createMockStrapi();
    await emitAuditEvent(strapi, 'create', {
      context: { user: toUserSummary({ id: 3 }), ipAddress: '9.9.9.9' },
      cronJob: { documentId: 'abc', name: 'Nightly' },
      details: { foo: 1 },
    });
    expect(strapi.eventHub.emit).toHaveBeenCalledWith(
      'strapi-plugin-cron.cron-job.create',
      expect.objectContaining({
        action: 'create',
        user: expect.objectContaining({ id: 3 }),
        ipAddress: '9.9.9.9',
        entity: {
          type: 'cron-job',
          uid: 'plugin::strapi-plugin-cron.cron-job',
          id: 'abc',
          displayName: 'Nightly',
        },
        details: { foo: 1 },
        timestamp: expect.any(String),
      })
    );
  });

  it('defaults entity and details when no job is known', async () => {
    const { strapi } = createMockStrapi();
    await emitAuditEvent(strapi, 'blocked', { context: SYSTEM_CONTEXT, cronJob: null });
    const [, payload] = strapi.eventHub.emit.mock.calls[0];
    expect(payload.entity).toMatchObject({ id: null, displayName: null });
    expect(payload.details).toEqual({});
    expect(payload.user).toBeNull();
  });

  it('never throws when a subscriber fails', async () => {
    const { strapi } = createMockStrapi();
    strapi.eventHub.emit.mockRejectedValueOnce(new Error('db down'));
    await expect(
      emitAuditEvent(strapi, 'delete', { context: SYSTEM_CONTEXT, cronJob: { documentId: 'x' } })
    ).resolves.toBeUndefined();
    expect(strapi.log.error).toHaveBeenCalled();
  });
});
