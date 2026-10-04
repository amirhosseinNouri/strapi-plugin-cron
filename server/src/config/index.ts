import type { Core } from '@strapi/strapi';
import { PLUGIN_ID } from '../../../utils/plugin';

export type PluginConfig = {
  /** Run the static security check on scripts before they are saved, scheduled or triggered. */
  securityCheck: boolean;
  /** Use the syntax-highlighting code editor in the admin panel. */
  syntaxHighlighting: boolean;
};

export const defaultConfig: PluginConfig = {
  securityCheck: true,
  syntaxHighlighting: true,
};

/** Reads the resolved plugin config; anything but an explicit `false` keeps the safe default. */
export const getPluginConfig = (strapi: Core.Strapi): PluginConfig => {
  const plugin = strapi.plugin(PLUGIN_ID);
  const read = (key: keyof PluginConfig) => (plugin.config(key) as unknown) !== false;
  return {
    securityCheck: read('securityCheck'),
    syntaxHighlighting: read('syntaxHighlighting'),
  };
};

const BOOLEAN_KEYS: Array<keyof PluginConfig> = ['securityCheck', 'syntaxHighlighting'];

export default {
  default: defaultConfig,
  validator(config: Partial<PluginConfig> & Record<string, unknown>) {
    for (const key of BOOLEAN_KEYS) {
      if (key in config && typeof config[key] !== 'boolean') {
        throw new Error(
          `strapi-plugin-secure-cron: config "${key}" must be a boolean, received ${typeof config[key]}`
        );
      }
    }
    if ('enforceAuth' in config) {
      throw new Error(
        'strapi-plugin-secure-cron: "enforceAuth" is not supported. Admin authentication is always required.'
      );
    }
  },
};
