import { Core } from '@strapi/strapi';
import type { CronJob } from '../../../../types';
import { PLUGIN_ID } from '../../../../utils/plugin';

const UID = `plugin::${PLUGIN_ID}.cron-job` as const;

// `email` is a private admin::user attribute and cannot be populated.
const CREATOR_FIELDS = ['firstname', 'lastname', 'username'];

const populateCreators = {
  createdBy: { fields: CREATOR_FIELDS },
  updatedBy: { fields: CREATOR_FIELDS },
};

type UserRef = { id: number } | null | undefined;

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const documents = () => strapi.documents(UID as any) as any;
  const cronService = () => strapi.plugin(PLUGIN_ID).service('cron');

  return {
    async getAll(): Promise<CronJob[]> {
      return documents().findMany({ populate: populateCreators });
    },

    async getOne(documentId: string): Promise<CronJob | null> {
      return documents().findOne({ documentId, populate: populateCreators });
    },

    async getPublished(): Promise<CronJob[]> {
      return documents().findMany({ filters: { publicationDate: { $notNull: true } } });
    },

    async create(data: Partial<CronJob>, user?: UserRef): Promise<CronJob> {
      return documents().create({
        data: { ...data, ...(user ? { createdBy: user.id, updatedBy: user.id } : {}) },
        populate: populateCreators,
      });
    },

    /** Internal updates (execution logs, counters) pass no user and keep updatedBy as is. */
    async update(documentId: string, data: Partial<CronJob>, user?: UserRef): Promise<CronJob> {
      return documents().update({
        documentId,
        data: { ...data, ...(user ? { updatedBy: user.id } : {}) },
        populate: populateCreators,
      });
    },

    async publish(documentId: string, user?: UserRef): Promise<CronJob> {
      const cronJob = await this.update(
        documentId,
        { iterationsCount: 0, publicationDate: new Date().toISOString() },
        user
      );
      await cronService().updateSchedule(cronJob);
      return cronJob;
    },

    async unpublish(documentId: string, user?: UserRef): Promise<CronJob> {
      const cronJob = await this.update(documentId, { publicationDate: null }, user);
      await cronService().updateSchedule(cronJob);
      return cronJob;
    },

    async delete(documentId: string): Promise<void> {
      cronService().cancel({ documentId });
      await documents().delete({ documentId });
    },
  };
};
