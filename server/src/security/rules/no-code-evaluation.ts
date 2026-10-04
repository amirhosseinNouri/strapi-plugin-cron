import { getMemberPath, isVariableReference } from '../ast';
import type { SecurityRule } from '../types';

const TIMER_FUNCTIONS = new Set(['setTimeout', 'setInterval', 'setImmediate']);
const GLOBAL_OBJECTS = new Set(['globalThis', 'global', 'window', 'self']);

const calleeName = (callee: any): string | null => {
  const path = getMemberPath(callee);
  if (!path) return null;
  if (path.length === 1) return path[0];
  if (path.length === 2 && GLOBAL_OBJECTS.has(path[0])) return path[1];
  return null;
};

export const noCodeEvaluation: SecurityRule = {
  id: 'no-code-evaluation',
  severity: 'error',
  description: 'Evaluating strings as code is not allowed.',
  rationale:
    'eval, the Function constructor and string-based timers run arbitrary code that cannot be reviewed or security-checked. Write the logic directly in the script.',
  create: (context) => {
    const checkCall = (node: any) => {
      const name = calleeName(node.callee);
      if (name === 'eval') context.report(node, 'eval() is not allowed.');
      else if (name === 'Function') context.report(node, 'The Function constructor is not allowed.');
      else if (name && TIMER_FUNCTIONS.has(name)) {
        const [first] = node.arguments;
        if (first && (first.type === 'Literal' || first.type === 'TemplateLiteral')) {
          context.report(node, `${name}() with a string argument evaluates code and is not allowed.`);
        }
      }
    };
    return {
      CallExpression: checkCall,
      NewExpression: checkCall,
      Identifier: (node, ancestors) => {
        if (node.name !== 'eval') return;
        const parent = ancestors[ancestors.length - 2];
        if (!isVariableReference(node, parent)) return;
        if ((parent?.type === 'CallExpression' || parent?.type === 'NewExpression') && parent.callee === node) return;
        context.report(node, 'Referencing eval is not allowed.');
      },
    };
  },
};
