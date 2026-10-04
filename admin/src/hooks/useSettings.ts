import { useQuery } from '@tanstack/react-query';
import type { PluginSettings } from '../../../types';
import { useCronApi } from '../api/cron';

/** Safe defaults while loading or if the request fails: highlighting on, check on. */
const DEFAULT_SETTINGS: PluginSettings = { securityCheck: true, syntaxHighlighting: true };

export const useSettings = (): PluginSettings => {
  const api = useCronApi();
  const { data } = useQuery({
    queryKey: ['cronSettings'],
    queryFn: api.getSettings,
    staleTime: Infinity,
  });
  return data ?? DEFAULT_SETTINGS;
};
