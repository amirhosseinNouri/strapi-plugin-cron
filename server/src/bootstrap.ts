import type { Core } from '@strapi/strapi';
import { PLUGIN_ID } from '../../utils/plugin';
import { permissionActions } from './permissions';

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  await strapi.admin.services.permission.actionProvider.registerMany(permissionActions);
  await strapi.plugin(PLUGIN_ID).service('cron').initialize();
};

export default bootstrap;
