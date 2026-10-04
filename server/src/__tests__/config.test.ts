import config, { defaultConfig, getPluginConfig } from '../config';
import { createMockStrapi } from './mock-strapi';

describe('plugin config', () => {
  it('defaults both features to enabled', () => {
    expect(config.default).toEqual({ securityCheck: true, syntaxHighlighting: true });
    expect(defaultConfig).toBe(config.default);
  });

  it('accepts booleans and empty config', () => {
    expect(() => config.validator({})).not.toThrow();
    expect(() => config.validator({ securityCheck: false, syntaxHighlighting: true })).not.toThrow();
  });

  it('rejects non-boolean values', () => {
    expect(() => config.validator({ securityCheck: 'false' as any })).toThrow(/securityCheck.*boolean/);
    expect(() => config.validator({ syntaxHighlighting: 1 as any })).toThrow(/syntaxHighlighting/);
  });

  it('rejects any attempt to configure auth', () => {
    expect(() => config.validator({ enforceAuth: false } as any)).toThrow(/always required/);
  });

  it('reads config, keeping safe defaults unless explicitly false', () => {
    expect(getPluginConfig(createMockStrapi().strapi)).toEqual({ securityCheck: true, syntaxHighlighting: true });
    expect(getPluginConfig(createMockStrapi({ securityCheck: false }).strapi)).toEqual({
      securityCheck: false,
      syntaxHighlighting: true,
    });
    expect(getPluginConfig(createMockStrapi({ syntaxHighlighting: 'no' }).strapi).syntaxHighlighting).toBe(true);
  });
});
