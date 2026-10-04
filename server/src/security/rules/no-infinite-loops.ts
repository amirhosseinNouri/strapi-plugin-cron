import { FUNCTION_TYPES, LOOP_TYPES } from '../ast';
import type { AstNode, SecurityRule } from '../types';

const isAlwaysTrue = (test: AstNode | null | undefined): boolean => {
  if (!test) return true;
  if (test.type === 'Literal') return Boolean(test.value);
  if (test.type === 'UnaryExpression' && test.operator === '!' && test.argument.type === 'Literal') {
    return !test.argument.value;
  }
  return false;
};

/** True if the loop body can exit the loop (break without label targeting an inner loop, return, throw). */
const canExit = (body: AstNode): boolean => {
  let found = false;
  const visit = (node: any, loopDepth: number, switchDepth: number) => {
    if (!node || typeof node.type !== 'string' || found) return;
    if (FUNCTION_TYPES.has(node.type)) return;
    if (node.type === 'ReturnStatement' || node.type === 'ThrowStatement') {
      found = true;
      return;
    }
    if (node.type === 'BreakStatement' && (node.label || (loopDepth === 0 && switchDepth === 0))) {
      found = true;
      return;
    }
    const nextLoop = LOOP_TYPES.has(node.type) ? loopDepth + 1 : loopDepth;
    const nextSwitch = node.type === 'SwitchStatement' ? switchDepth + 1 : switchDepth;
    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'start' || key === 'end') continue;
      const value = node[key];
      if (Array.isArray(value)) value.forEach((child) => visit(child, nextLoop, nextSwitch));
      else if (value && typeof value === 'object') visit(value, nextLoop, nextSwitch);
    }
  };
  visit(body, 0, 0);
  return found;
};

export const noInfiniteLoops: SecurityRule = {
  id: 'no-infinite-loops',
  severity: 'warning',
  description: 'The script contains a loop that never exits.',
  rationale:
    'Scripts run inside the Strapi server process. A loop without an exit blocks the event loop and freezes the whole CMS.',
  create: (context) => {
    const check = (node: AstNode) => {
      if (isAlwaysTrue(node.test) && !canExit(node.body)) {
        context.report(node, 'This loop has no reachable exit and would freeze the server.');
      }
    };
    return {
      WhileStatement: check,
      DoWhileStatement: check,
      ForStatement: check,
    };
  },
};
