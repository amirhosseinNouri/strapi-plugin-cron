import type { Core } from '@strapi/strapi';
import { PLUGIN_ID } from '../../utils/plugin';

const destroy = ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.plugin(PLUGIN_ID).service('cron').cancelAll();
};

export default destroy;
