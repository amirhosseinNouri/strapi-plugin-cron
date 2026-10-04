import { getMemberPath, isInsideLoop } from '../ast';
import type { SecurityRule } from '../types';

export const noBulkDeletes: SecurityRule = {
  id: 'no-bulk-deletes',
  severity: 'warning',
  description: 'The script deletes content in bulk.',
  rationale:
    'deleteMany() or delete() inside a loop can wipe a whole collection on every tick. Double-check the filters before acknowledging.',
  create: (context) => ({
    CallExpression: (node, ancestors) => {
      const path = getMemberPath(node.callee);
      const method = path?.[path.length - 1];
      if (method === 'deleteMany') {
        context.report(node, 'deleteMany() removes many entries at once. Double-check its filters.');
      } else if (method === 'delete' && path!.length > 1 && isInsideLoop(ancestors)) {
        context.report(node, 'delete() inside a loop can remove many entries. Double-check the loop.');
      }
    },
  }),
};
