import { PLUGIN_ID } from '../../utils/plugin';

export const PERMISSION_ACTIONS = ['read', 'create', 'update', 'delete', 'trigger'] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export const permissionUid = (action: PermissionAction) => `plugin::${PLUGIN_ID}.${action}`;

const DISPLAY_NAMES: Record<PermissionAction, string> = {
  read: 'Read cron jobs',
  create: 'Create cron jobs',
  update: 'Update and publish cron jobs',
  delete: 'Delete cron jobs',
  trigger: 'Trigger cron jobs manually',
};

export const permissionActions = PERMISSION_ACTIONS.map((action) => ({
  section: 'plugins' as const,
  displayName: DISPLAY_NAMES[action],
  uid: action,
  pluginName: PLUGIN_ID,
}));
