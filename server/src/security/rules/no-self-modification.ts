import { PLUGIN_ID } from '../../../../utils/plugin';
import type { SecurityRule } from '../types';

const SELF_REFERENCES = [`plugin::${PLUGIN_ID}`, PLUGIN_ID];

export const noSelfModification: SecurityRule = {
  id: 'no-self-modification',
  severity: 'warning',
  description: 'The script accesses cron jobs themselves.',
  rationale:
    'A cron job that edits cron jobs can rewrite scripts after they passed this check, without leaving an audit trail of who changed them. Manage cron jobs through the admin panel.',
  create: (context) => ({
    Literal: (node) => {
      if (typeof node.value !== 'string') return;
      if (SELF_REFERENCES.some((reference) => node.value.trim().startsWith(reference))) {
        context.report(node, 'The script references the cron plugin itself.');
      }
    },
    TemplateElement: (node) => {
      const value = node.value.cooked ?? '';
      if (SELF_REFERENCES.some((reference) => value.includes(reference))) {
        context.report(node, 'The script references the cron plugin itself.');
      }
    },
  }),
};
