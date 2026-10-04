import { getMemberPath } from '../ast';
import type { SecurityRule } from '../types';

const BASE64 = /^[A-Za-z0-9+/_-]+={0,2}$/;
const HEX = /^(?:0x)?[0-9a-fA-F]+$/;
export const LONG_BASE64_LENGTH = 120;
export const LONG_HEX_LENGTH = 64;
const ESCAPES = /\\(?:x[0-9a-fA-F]{2}|u\{?[0-9a-fA-F]{2,6}\}?)/g;
export const ESCAPE_THRESHOLD = 6;

const looksEncoded = (value: string): string | null => {
  const compact = value.replace(/\s+/g, '');
  if (compact.length >= LONG_HEX_LENGTH && HEX.test(compact)) return 'a long hex-encoded string';
  if (compact.length >= LONG_BASE64_LENGTH && BASE64.test(compact) && /[0-9]/.test(compact) && /[A-Z]/.test(compact) && /[a-z]/.test(compact)) {
    return 'a long base64-encoded string';
  }
  return null;
};

export const noObfuscation: SecurityRule = {
  id: 'no-obfuscation',
  severity: 'warning',
  description: 'The script contains patterns commonly used to hide code.',
  rationale:
    'Encoded payloads, heavy escape sequences and character-code assembly hide what a script really does from reviewers and from this check. Keep scripts readable; store large data in content types instead.',
  create: (context) => ({
    Literal: (node) => {
      if (typeof node.value !== 'string') return;
      const encoded = looksEncoded(node.value);
      if (encoded) context.report(node, `The script contains ${encoded}.`);
      const escapes = (node.raw?.match(ESCAPES) ?? []).length;
      if (escapes >= ESCAPE_THRESHOLD) {
        context.report(node, 'The script contains a string built from many escape sequences.');
      }
    },
    TemplateElement: (node) => {
      const encoded = looksEncoded(node.value.cooked ?? '');
      if (encoded) context.report(node, `The script contains ${encoded}.`);
      const escapes = (node.value.raw.match(ESCAPES) ?? []).length;
      if (escapes >= ESCAPE_THRESHOLD) {
        context.report(node, 'The script contains a string built from many escape sequences.');
      }
    },
    CallExpression: (node) => {
      const path = getMemberPath(node.callee);
      const name = path?.join('.');
      if (name === 'String.fromCharCode' || name === 'String.fromCodePoint') {
        context.report(node, `${name}() is commonly used to hide strings.`);
      } else if (name === 'atob' || name === 'globalThis.atob') {
        context.report(node, 'atob() decodes hidden payloads.');
      } else if (
        name === 'Buffer.from' &&
        node.arguments[1]?.type === 'Literal' &&
        ['base64', 'hex', 'base64url'].includes(node.arguments[1].value)
      ) {
        context.report(node, `Decoding ${node.arguments[1].value} data with Buffer.from() can hide payloads.`);
      }
    },
  }),
};
