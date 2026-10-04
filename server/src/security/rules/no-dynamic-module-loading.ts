import { getStaticString, isVariableReference } from '../ast';
import type { SecurityRule } from '../types';

export const noDynamicModuleLoading: SecurityRule = {
  id: 'no-dynamic-module-loading',
  severity: 'error',
  description: 'Loading modules is not allowed in cron scripts.',
  rationale:
    'require() and import() are how a script escapes the strapi API surface. Computed module names also defeat static review. Everything a cron script needs is available on the strapi object.',
  create: (context) => ({
    ImportExpression: (node) => {
      if (getStaticString(node.source) === null) {
        context.report(node, 'Dynamic import() with a computed module name is not allowed.');
      } else {
        context.report(node, 'import() is not allowed in cron scripts.');
      }
    },
    Identifier: (node, ancestors) => {
      if (node.name !== 'require') return;
      const parent = ancestors[ancestors.length - 2];
      if (!isVariableReference(node, parent)) return;
      if (parent?.type === 'CallExpression' && parent.callee === node) {
        if (getStaticString(parent.arguments[0]) === null) {
          context.report(parent, 'require() with a computed module name is not allowed.');
        } else {
          context.report(parent, 'require() is not allowed in cron scripts.');
        }
        return;
      }
      context.report(node, 'Referencing require is not allowed.');
    },
  }),
};
