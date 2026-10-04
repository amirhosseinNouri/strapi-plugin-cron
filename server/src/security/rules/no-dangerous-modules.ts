import { getStaticString } from '../ast';
import type { SecurityRule } from '../types';

export const DANGEROUS_MODULES = new Set([
  'child_process',
  'cluster',
  'dgram',
  'dns',
  'fs',
  'fs/promises',
  'http',
  'http2',
  'https',
  'inspector',
  'module',
  'net',
  'os',
  'process',
  'repl',
  'tls',
  'v8',
  'vm',
  'worker_threads',
]);

const normalize = (specifier: string) => specifier.replace(/^node:/, '');

export const noDangerousModules: SecurityRule = {
  id: 'no-dangerous-modules',
  severity: 'error',
  description: 'Loading Node.js system modules is not allowed.',
  rationale:
    'Modules such as child_process, fs, net, http and vm give a script shell, filesystem and network access to the server. Use the strapi APIs passed to the script instead.',
  create: (context) => {
    const check = (node: any, source: any) => {
      const specifier = getStaticString(source);
      if (specifier !== null && DANGEROUS_MODULES.has(normalize(specifier))) {
        context.report(node, `Loading the "${specifier}" module is not allowed.`);
      }
    };
    return {
      CallExpression: (node) => {
        if (node.callee.type === 'Identifier' && node.callee.name === 'require') {
          check(node, node.arguments[0]);
        }
      },
      ImportExpression: (node) => check(node, node.source),
    };
  },
};
