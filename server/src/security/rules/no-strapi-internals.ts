import { getMemberPath } from '../ast';
import type { SecurityRule } from '../types';

const FORBIDDEN = new Map<string, string>([
  ['config', 'strapi.config exposes secrets such as database credentials and JWT keys.'],
  ['admin', 'strapi.admin exposes admin users, roles and permissions.'],
  ['server', 'strapi.server can register routes or middleware at runtime.'],
  ['destroy', 'strapi.destroy() shuts the server down.'],
  ['reload', 'strapi.reload() restarts the server.'],
  ['stop', 'strapi.stop() shuts the server down.'],
  ['container', 'strapi.container exposes every internal service.'],
  ['dirs', 'strapi.dirs exposes the server filesystem layout.'],
  ['fs', 'strapi.fs writes to the server filesystem.'],
  ['internal_config', 'strapi.internal_config exposes internal settings.'],
  ['ee', 'strapi.ee exposes licence internals.'],
  ['get', 'strapi.get() reads arbitrary internal registries.'],
  ['register', 'strapi.register() mutates the application.'],
  ['add', 'strapi.add() mutates the application.'],
]);

export const noStrapiInternals: SecurityRule = {
  id: 'no-strapi-internals',
  severity: 'error',
  description: 'Accessing sensitive strapi internals is not allowed.',
  rationale:
    'Cron scripts should work with content through strapi.documents(). Configuration, server lifecycle and container internals expose secrets or can take the server down.',
  create: (context) => ({
    MemberExpression: (node) => {
      const path = getMemberPath(node);
      if (!path || path.length !== 2 || path[0] !== 'strapi') return;
      const reason = FORBIDDEN.get(path[1]);
      if (reason) context.report(node, `strapi.${path[1]} is not allowed: ${reason}`);
    },
  }),
};
