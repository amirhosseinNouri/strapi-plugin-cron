import { permissionUid, type PermissionAction } from '../permissions';
import { PLUGIN_ID } from '../../../utils/plugin';

/**
 * Every route is an admin route: it requires an authenticated admin session
 * (never `auth: false`) plus the matching RBAC permission.
 */
const requires = (...actions: PermissionAction[]) => ({
  policies: [
    'admin::isAuthenticatedAdmin',
    { name: 'admin::hasPermissions', config: { actions: actions.map(permissionUid) } },
  ],
});

const route = (method: string, path: string, handler: string, config: object) => ({
  method,
  path,
  handler: `cronJobController.${handler}`,
  config,
});

export const adminRoutes = [
  route('GET', '/settings', 'settings', requires('read')),
  route('GET', '/security-rules', 'rules', requires('read')),
  route('GET', '/cron-jobs', 'getAll', requires('read')),
  route('GET', '/cron-jobs/:documentId', 'getOne', requires('read')),
  route('POST', '/cron-jobs', 'create', requires('create')),
  route('POST', '/cron-jobs/validate-script', 'validateScript', {
    policies: ['admin::isAuthenticatedAdmin', `plugin::${PLUGIN_ID}.can-edit-scripts`],
  }),
  route('PUT', '/cron-jobs/:documentId', 'update', requires('update')),
  route('PUT', '/cron-jobs/publish/:documentId', 'publish', requires('update')),
  route('PUT', '/cron-jobs/unpublish/:documentId', 'unpublish', requires('update')),
  route('DELETE', '/cron-jobs/:documentId', 'delete', requires('delete')),
  route('POST', '/cron-jobs/trigger/:documentId', 'trigger', requires('trigger')),
];

export default {
  admin: {
    type: 'admin',
    routes: adminRoutes,
  },
};
