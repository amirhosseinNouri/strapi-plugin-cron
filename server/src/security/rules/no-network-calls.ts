import { getMemberPath } from '../ast';
import type { SecurityRule } from '../types';

const NETWORK_FUNCTIONS = new Set(['fetch', 'globalThis.fetch', 'global.fetch']);
const NETWORK_CONSTRUCTORS = new Set(['WebSocket', 'XMLHttpRequest', 'EventSource']);

export const noNetworkCalls: SecurityRule = {
  id: 'no-network-calls',
  severity: 'warning',
  description: 'The script makes outbound network requests.',
  rationale:
    'Outbound requests can send CMS data to third parties. They are sometimes legitimate (webhooks, cache warming); make sure the destination is trusted before acknowledging.',
  create: (context) => ({
    CallExpression: (node) => {
      const name = getMemberPath(node.callee)?.join('.');
      if (name && NETWORK_FUNCTIONS.has(name)) {
        context.report(node, 'fetch() sends data outside the server. Check the destination is trusted.');
      }
    },
    NewExpression: (node) => {
      const name = getMemberPath(node.callee)?.join('.');
      if (name && NETWORK_CONSTRUCTORS.has(name)) {
        context.report(node, `${name} opens a network connection. Check the destination is trusted.`);
      }
    },
  }),
};
