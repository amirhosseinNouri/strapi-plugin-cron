import { permissionUid } from '../permissions';

/** Allows admins who can either create or update cron jobs (used by script validation). */
const canEditScripts = (policyContext: any) => {
  const ability = policyContext.state?.userAbility;
  if (!ability) return false;
  return ability.can(permissionUid('create')) || ability.can(permissionUid('update'));
};

export default {
  'can-edit-scripts': canEditScripts,
};
