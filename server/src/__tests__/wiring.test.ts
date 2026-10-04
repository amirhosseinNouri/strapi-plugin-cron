import plugin from '../index';
import bootstrap from '../bootstrap';
import destroy from '../destroy';
import register from '../register';
import routes, { adminRoutes } from '../routes';
import policies from '../policies';
import { PERMISSION_ACTIONS, permissionActions, permissionUid } from '../permissions';
import contentTypes from '../content-types';
import { createMockStrapi } from './mock-strapi';

describe('plugin wiring', () => {
  it('exports all server entry points', () => {
    expect(Object.keys(plugin).sort()).toEqual(
      ['bootstrap', 'config', 'contentTypes', 'controllers', 'destroy', 'middlewares', 'policies', 'register', 'routes', 'services'].sort()
    );
    expect(Object.keys(plugin.services).sort()).toEqual(['cron', 'cron-job', 'security']);
  });

  it('no longer has file-mode attributes and requires a script', () => {
    const { attributes } = contentTypes['cron-job'].schema as any;
    expect(attributes).not.toHaveProperty('executeScriptFromFile');
    expect(attributes).not.toHaveProperty('pathToScript');
    expect(attributes.script.required).toBe(true);
  });
});

describe('permissions', () => {
  it('defines the five RBAC actions', () => {
    expect(PERMISSION_ACTIONS).toEqual(['read', 'create', 'update', 'delete', 'trigger']);
    expect(permissionUid('trigger')).toBe('plugin::strapi-plugin-cron.trigger');
    expect(permissionActions).toHaveLength(5);
    for (const action of permissionActions) {
      expect(action).toMatchObject({ section: 'plugins', pluginName: 'strapi-plugin-cron' });
      expect(action.displayName.length).toBeGreaterThan(0);
    }
  });
});

describe('routes', () => {
  it('registers admin-type routes only', () => {
    expect(routes.admin.type).toBe('admin');
    expect(routes.admin.routes).toBe(adminRoutes);
  });

  it('never disables auth and always requires an authenticated admin', () => {
    for (const route of adminRoutes) {
      const config: any = route.config;
      expect(config.auth).toBeUndefined();
      expect(config.policies[0]).toBe('admin::isAuthenticatedAdmin');
      expect(config.policies.length).toBe(2);
    }
  });

  const expectations: Array<[string, string, string]> = [
    ['GET', '/cron-jobs', 'read'],
    ['GET', '/cron-jobs/:documentId', 'read'],
    ['GET', '/settings', 'read'],
    ['GET', '/security-rules', 'read'],
    ['POST', '/cron-jobs', 'create'],
    ['PUT', '/cron-jobs/:documentId', 'update'],
    ['PUT', '/cron-jobs/publish/:documentId', 'update'],
    ['PUT', '/cron-jobs/unpublish/:documentId', 'update'],
    ['DELETE', '/cron-jobs/:documentId', 'delete'],
    ['POST', '/cron-jobs/trigger/:documentId', 'trigger'],
  ];

  it.each(expectations)('%s %s requires %s', (method, path, action) => {
    const route: any = adminRoutes.find((r) => r.method === method && r.path === path);
    expect(route).toBeDefined();
    expect(route.config.policies[1]).toEqual({
      name: 'admin::hasPermissions',
      config: { actions: [`plugin::strapi-plugin-cron.${action}`] },
    });
  });

  it('uses POST for trigger (never GET)', () => {
    expect(adminRoutes.filter((r) => r.path.includes('trigger')).map((r) => r.method)).toEqual(['POST']);
  });

  it('protects script validation with the create-or-update policy', () => {
    const route: any = adminRoutes.find((r) => r.path === '/cron-jobs/validate-script');
    expect(route.method).toBe('POST');
    expect(route.config.policies[1]).toBe('plugin::strapi-plugin-cron.can-edit-scripts');
  });
});

describe('can-edit-scripts policy', () => {
  const policy = policies['can-edit-scripts'];
  const withAbility = (allowed: string[]) => ({
    state: { userAbility: { can: (action: string) => allowed.includes(action) } },
  });

  it('allows create or update', () => {
    expect(policy(withAbility(['plugin::strapi-plugin-cron.create']))).toBe(true);
    expect(policy(withAbility(['plugin::strapi-plugin-cron.update']))).toBe(true);
  });

  it('denies other permissions or missing ability', () => {
    expect(policy(withAbility(['plugin::strapi-plugin-cron.read']))).toBe(false);
    expect(policy({ state: {} })).toBe(false);
    expect(policy({})).toBe(false);
  });
});

describe('lifecycle', () => {
  it('bootstrap registers RBAC actions then schedules jobs', async () => {
    const { strapi, services } = createMockStrapi();
    const order: string[] = [];
    strapi.admin.services.permission.actionProvider.registerMany.mockImplementation(async () => order.push('rbac'));
    services.cron = { initialize: jest.fn(async () => order.push('cron')) };
    await bootstrap({ strapi });
    expect(strapi.admin.services.permission.actionProvider.registerMany).toHaveBeenCalledWith(permissionActions);
    expect(order).toEqual(['rbac', 'cron']);
  });

  it('destroy cancels the plugin jobs', () => {
    const { strapi, services } = createMockStrapi();
    services.cron = { cancelAll: jest.fn() };
    destroy({ strapi });
    expect(services.cron.cancelAll).toHaveBeenCalled();
  });

  it('register is a no-op', () => {
    expect(register({ strapi: createMockStrapi().strapi })).toBeUndefined();
  });
});
