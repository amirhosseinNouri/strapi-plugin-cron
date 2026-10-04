import { PLUGIN_ID } from '../../utils/plugin';

const permission = (action: string) => [{ action: `plugin::${PLUGIN_ID}.${action}`, subject: null }];

export const pluginPermissions = {
  read: permission('read'),
  create: permission('create'),
  update: permission('update'),
  delete: permission('delete'),
  trigger: permission('trigger'),
};

/** Flat list for useRBAC: yields allowedActions.canRead, canCreate, canUpdate, canDelete, canTrigger. */
export const allPluginPermissions = Object.values(pluginPermissions).flat();
