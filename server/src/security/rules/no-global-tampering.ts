import { getMemberPath } from '../ast';
import type { SecurityRule } from '../types';

const GLOBAL_OBJECTS = new Set(['globalThis', 'global', 'window', 'self']);
const BUILTINS = new Set([
  'Object',
  'Array',
  'Function',
  'String',
  'Number',
  'Boolean',
  'Promise',
  'JSON',
  'Math',
  'Reflect',
  'console',
  'strapi',
]);

const targetPath = (node: any): string[] | null => {
  if (node.type === 'MemberExpression' || node.type === 'Identifier') return getMemberPath(node);
  return null;
};

const isTampering = (path: string[] | null, wholeObject = false): string | null => {
  if (!path) return null;
  if (wholeObject && path.length === 1 && (GLOBAL_OBJECTS.has(path[0]) || BUILTINS.has(path[0]))) {
    return path[0];
  }
  if (GLOBAL_OBJECTS.has(path[0]) && path.length >= 2) return `${path[0]}.${path[1]}`;
  if (BUILTINS.has(path[0]) && path.length >= 2 && path[0] !== 'strapi') return path.slice(0, 2).join('.');
  if (path.includes('prototype') || path.includes('__proto__')) return path.join('.');
  if (path[0] === 'strapi' && path.length >= 2) return path.join('.');
  return null;
};

export const noGlobalTampering: SecurityRule = {
  id: 'no-global-tampering',
  severity: 'error',
  description: 'Modifying globals, built-in prototypes or the strapi object is not allowed.',
  rationale:
    'Overwriting globals, prototypes or strapi internals changes the behaviour of the whole server process, not only the script, and is a common persistence technique.',
  create: (context) => {
    const check = (node: any, target: any, wholeObject = false) => {
      if (!target) return;
      const name = isTampering(targetPath(target), wholeObject);
      if (name) context.report(node, `Modifying ${name} is not allowed.`);
    };
    return {
      AssignmentExpression: (node) => check(node, node.left),
      UpdateExpression: (node) => check(node, node.argument),
      UnaryExpression: (node) => {
        if (node.operator === 'delete') check(node, node.argument);
      },
      CallExpression: (node) => {
        const path = getMemberPath(node.callee);
        if (!path) return;
        const name = path.join('.');
        if (
          ['Object.defineProperty', 'Object.defineProperties', 'Object.setPrototypeOf', 'Object.assign', 'Reflect.defineProperty', 'Reflect.set', 'Reflect.setPrototypeOf'].includes(name)
        ) {
          check(node, node.arguments[0], true);
        }
      },
    };
  },
};
