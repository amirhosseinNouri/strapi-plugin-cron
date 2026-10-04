import type { SecurityRule } from '../types';
import { getMemberPath } from '../ast';

export const noPrototypeEscape: SecurityRule = {
  id: 'no-prototype-escape',
  severity: 'error',
  description: 'Reaching constructors through prototypes is not allowed.',
  rationale:
    'Chains like x.constructor.constructor or __proto__ reach the Function constructor and evaluate arbitrary code without the words eval or Function appearing in the script.',
  create: (context) => ({
    MemberExpression: (node, ancestors) => {
      const path = getMemberPath(node);
      const property = path?.[path.length - 1] ?? (node.computed ? null : node.property?.name);
      if (property === '__proto__') {
        context.report(node, 'Accessing __proto__ is not allowed.');
        return;
      }
      if (property !== 'constructor') return;
      const objectIsConstructorAccess =
        node.object.type === 'MemberExpression' &&
        ((!node.object.computed && node.object.property.name === 'constructor') ||
          (node.object.computed && node.object.property.value === 'constructor'));
      const parent = ancestors[ancestors.length - 2];
      const isCalled = parent?.type === 'CallExpression' && parent.callee === node;
      const isFunctionLiteral = ['FunctionExpression', 'ArrowFunctionExpression'].includes(node.object.type);
      if (objectIsConstructorAccess || (isCalled && isFunctionLiteral)) {
        context.report(node, 'Reaching the Function constructor through .constructor is not allowed.');
      }
    },
  }),
};
