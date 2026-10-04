import { getMemberPath, getStaticString } from '../ast';
import type { SecurityRule } from '../types';

const LOOKUP_METHODS = new Set([
  'service',
  'controller',
  'query',
  'documents',
  'contentType',
  'plugin',
  'policy',
  'middleware',
]);

export const isSensitiveUid = (uid: string): boolean => {
  const normalized = uid.trim().toLowerCase();
  return (
    normalized === 'admin' ||
    normalized.startsWith('admin::') ||
    normalized === 'users-permissions' ||
    normalized.startsWith('plugin::users-permissions')
  );
};

const lookupMethod = (callee: any): string | null => {
  const path = getMemberPath(callee);
  if (!path || path[0] !== 'strapi') return null;
  const method = path[path.length - 1];
  if (path.length === 2 && LOOKUP_METHODS.has(method)) return method;
  if (path.length === 3 && path[1] === 'db' && method === 'query') return 'db.query';
  if (path.length === 3 && path[1] === 'entityService') return `entityService.${method}`;
  return null;
};

export const noSensitiveServices: SecurityRule = {
  id: 'no-sensitive-services',
  severity: 'error',
  description: 'Accessing admin or users-permissions internals is not allowed.',
  rationale:
    'Admin users, roles, API tokens and users-permissions accounts control who can access the CMS. A cron script that can read or change them is an account-takeover risk.',
  create: (context) => ({
    CallExpression: (node) => {
      const method = lookupMethod(node.callee);
      if (!method) return;
      const uid = getStaticString(node.arguments[0]);
      if (uid !== null && isSensitiveUid(uid)) {
        context.report(node, `strapi.${method}('${uid}') targets a sensitive admin or users-permissions resource.`);
      }
    },
  }),
};
