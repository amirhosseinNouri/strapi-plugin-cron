import { getMemberPath, pathStartsWith } from '../ast';
import type { SecurityRule } from '../types';

export const noRawDatabase: SecurityRule = {
  id: 'no-raw-database',
  severity: 'error',
  description: 'Raw database access is not allowed.',
  rationale:
    'strapi.db.connection (knex) and .raw() run arbitrary SQL, bypassing Strapi validation and access control, and can read admin users, tokens and secrets. Use strapi.documents() instead.',
  create: (context) => ({
    MemberExpression: (node, ancestors) => {
      const path = getMemberPath(node);
      const parent = ancestors[ancestors.length - 2];
      // Report only the outermost relevant segment to avoid duplicates.
      if (pathStartsWith(path, ['strapi', 'db', 'connection']) && path!.length === 3) {
        context.report(node, 'strapi.db.connection gives raw SQL access and is not allowed.');
      }
      if (
        path?.[path.length - 1] === 'raw' &&
        parent?.type === 'CallExpression' &&
        parent.callee === node
      ) {
        context.report(parent, 'Raw SQL via .raw() is not allowed.');
      }
    },
    Identifier: (node) => {
      if (node.name === 'knex') context.report(node, 'Using knex directly is not allowed.');
    },
  }),
};
