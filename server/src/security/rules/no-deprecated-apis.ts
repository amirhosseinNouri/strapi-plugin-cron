import { getMemberPath } from '../ast';
import type { SecurityRule } from '../types';

export const noDeprecatedApis: SecurityRule = {
  id: 'no-deprecated-apis',
  severity: 'warning',
  description: 'The script uses a deprecated Strapi API.',
  rationale:
    'strapi.entityService is deprecated in Strapi 5 and skips document-level logic. Use strapi.documents() instead.',
  create: (context) => ({
    MemberExpression: (node) => {
      const path = getMemberPath(node);
      if (path?.length === 2 && path[0] === 'strapi' && path[1] === 'entityService') {
        context.report(node, 'strapi.entityService is deprecated. Use strapi.documents() instead.');
      }
    },
  }),
};
