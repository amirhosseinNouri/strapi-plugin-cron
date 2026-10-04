import { parse } from 'acorn';
import { full, fullAncestor } from 'acorn-walk';
import { CALL, DYNAMIC, getMemberPath, getStaticString, isInsideLoop, isVariableReference, pathStartsWith } from '../ast';

const expr = (source: string): any =>
  (parse(source, { ecmaVersion: 'latest', allowAwaitOutsideFunction: true }) as any).body[0].expression;

describe('getStaticString', () => {
  it('reads literals and expression-free templates', () => {
    expect(getStaticString(expr("'a'"))).toBe('a');
    expect(getStaticString(expr('`a${"b"}`'))).toBeNull();
    expect(getStaticString(expr('`ab`'))).toBe('ab');
    expect(getStaticString(expr('(("x"))'))).toBe('x');
    expect(getStaticString(expr('1'))).toBeNull();
    expect(getStaticString(null)).toBeNull();
    expect(getStaticString(undefined)).toBeNull();
  });

  it('treats invalid escapes in tagged templates as empty', () => {
    const tagged = expr('tag`\\unicode`');
    expect(getStaticString(tagged.quasi)).toBe('');
  });
});

describe('getMemberPath', () => {
  it('flattens member chains', () => {
    expect(getMemberPath(expr('strapi.db.connection'))).toEqual(['strapi', 'db', 'connection']);
    expect(getMemberPath(expr("strapi['config']"))).toEqual(['strapi', 'config']);
    expect(getMemberPath(expr('a[0]'))).toEqual(['a', '0']);
    expect(getMemberPath(expr('a[key]'))).toEqual(['a', DYNAMIC]);
    expect(getMemberPath(expr('this.x'))).toEqual(['this', 'x']);
    expect(getMemberPath(expr('a?.b?.c'))).toEqual(['a', 'b', 'c']);
    expect(getMemberPath(expr("strapi.plugin('x').service"))).toEqual(['strapi', 'plugin', CALL, 'service']);
  });

  it('handles private fields', () => {
    const program: any = parse('class A { #x; m() { return this.#x } }', { ecmaVersion: 'latest' });
    let member: any;
    full(program, (node: any) => {
      if (node.type === 'MemberExpression') member = node;
    });
    expect(getMemberPath(member)).toEqual(['this', '#x']);
  });

  it('returns null for chains not rooted in an identifier', () => {
    expect(getMemberPath(expr('"s".length'))).toBeNull();
    expect(getMemberPath(expr('(() => 1)()'))).toBeNull();
    expect(getMemberPath(null)).toBeNull();
  });
});

describe('pathStartsWith', () => {
  it('compares prefixes', () => {
    expect(pathStartsWith(['a', 'b', 'c'], ['a', 'b'])).toBe(true);
    expect(pathStartsWith(['a'], ['a', 'b'])).toBe(false);
    expect(pathStartsWith(null, ['a'])).toBe(false);
    expect(pathStartsWith(['a', 'x'], ['a', 'b'])).toBe(false);
  });
});

describe('isVariableReference', () => {
  const references = (source: string, name: string): boolean[] => {
    const program: any = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
    const result: boolean[] = [];
    // Visit every node (acorn-walk skips property names, labels and specifiers).
    const visit = (node: any, parent: any) => {
      if (!node || typeof node.type !== 'string') return;
      if (node.type === 'Identifier' && node.name === name) {
        result.push(isVariableReference(node, parent));
      }
      for (const key of Object.keys(node)) {
        const value = node[key];
        if (Array.isArray(value)) value.forEach((child) => visit(child, node));
        else if (value && typeof value === 'object' && key !== 'loc') visit(value, node);
      }
    };
    visit(program, undefined);
    return result;
  };

  it.each([
    ['x;', [true]],
    ['a.x;', [false]],
    ['a[x];', [true]],
    ['x.a;', [true]],
    ['({ x: 1 });', [false]],
    ['({ [x]: 1 });', [true]],
    ['({ a: x });', [true]],
    ['({ x });', [false, true]],
    ['class A { x() {} }', [false]],
    ['class A { x = 1 }', [false]],
    ['class A { [x] = 1 }', [true]],
    ['x: for (;;) { break x; }', [false, false]],
    ['x: for (;;) { continue x; }', [false, false]],
    ['function x() {}', [false]],
    ['(function (x) {});', [false]],
    ['class x {}', [false]],
    ['const x = 1;', [false]],
    ['const a = x;', [true]],
    ['export { x as y }; const x = 1;', [false, false]],
    ["import x from 'm';", [false]],
    ["import { x } from 'm';", [false, false]],
    ["import * as x from 'm';", [false]],
  ])('%s', (source, expected) => {
    expect(references(source, 'x')).toEqual(expected);
  });

  it('treats a missing parent as a reference', () => {
    expect(isVariableReference({ type: 'Identifier', start: 0, end: 0 }, undefined)).toBe(true);
  });
});

describe('isInsideLoop', () => {
  const inLoop = (source: string): boolean => {
    const program: any = parse(source, { ecmaVersion: 'latest' });
    let result = false;
    fullAncestor(program, (node: any, _s: unknown, ancestors: any[]) => {
      if (node.type === 'CallExpression' && node.callee.property?.name === 'target') {
        result = isInsideLoop(ancestors);
      }
    });
    return result;
  };

  it('detects loops and iteration callbacks', () => {
    expect(inLoop('for (;;) { a.target() }')).toBe(true);
    expect(inLoop('items.map((i) => a.target())')).toBe(true);
    expect(inLoop('items.forEach(function () { a.target() })')).toBe(true);
    expect(inLoop('a.target()')).toBe(false);
    expect(inLoop('run(() => a.target())')).toBe(false);
    expect(inLoop('(() => a.target())()')).toBe(false);
  });
});
