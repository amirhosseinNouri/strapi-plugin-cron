import { DYNAMIC, getMemberPath } from '../ast';
import type { SecurityRule } from '../types';

const WATCHED_ROOTS = new Set(['strapi', 'globalThis', 'global', 'window', 'self', 'this']);

export const noDynamicPropertyAccess: SecurityRule = {
  id: 'no-dynamic-property-access',
  severity: 'warning',
  description: 'Computed property access on strapi or globals cannot be checked.',
  rationale:
    'strapi[name] or globalThis[name] lets a script reach any internal at runtime, so the static check cannot tell what it touches. Use literal property names.',
  create: (context) => ({
    MemberExpression: (node) => {
      if (!node.computed) return;
      const path = getMemberPath(node);
      if (!path || !WATCHED_ROOTS.has(path[0])) return;
      if (path[path.length - 1] === DYNAMIC && !path.slice(0, -1).includes(DYNAMIC)) {
        context.report(node, `Computed property access on ${path[0]} cannot be security-checked.`);
      }
    },
    CallExpression: (node) => {
      const path = getMemberPath(node.callee);
      if (!path || path[0] !== 'strapi' || path.length !== 2) return;
      if (!['service', 'plugin', 'query', 'documents', 'controller', 'contentType'].includes(path[1])) return;
      const [first] = node.arguments;
      if (first && !(first.type === 'Literal' || (first.type === 'TemplateLiteral' && first.expressions.length === 0))) {
        context.report(node, `strapi.${path[1]}() with a computed name cannot be security-checked.`);
      }
    },
  }),
};
