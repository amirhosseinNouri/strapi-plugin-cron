import { getMemberPath, isVariableReference } from '../ast';
import type { SecurityRule } from '../types';

const GLOBAL_OBJECTS = new Set(['globalThis', 'global', 'window', 'self']);

export const noProcessAccess: SecurityRule = {
  id: 'no-process-access',
  severity: 'error',
  description: 'Accessing the Node.js process object is not allowed.',
  rationale:
    'process exposes environment variables (secrets), process.exit, process.binding and process.mainModule.require, which bypass every other safeguard.',
  create: (context) => ({
    Identifier: (node, ancestors) => {
      if (node.name !== 'process') return;
      if (!isVariableReference(node, ancestors[ancestors.length - 2])) return;
      context.report(node, 'Accessing process is not allowed.');
    },
    MemberExpression: (node) => {
      const path = getMemberPath(node);
      if (path && path.length === 2 && GLOBAL_OBJECTS.has(path[0]) && path[1] === 'process') {
        context.report(node, 'Accessing process is not allowed.');
      }
    },
  }),
};
