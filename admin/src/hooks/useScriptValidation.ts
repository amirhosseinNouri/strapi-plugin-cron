import { useEffect, useState } from 'react';
import type { SecurityCheckResult } from '../../../types';
import { useCronApi } from '../api/cron';

export const VALIDATION_DEBOUNCE_MS = 500;

/**
 * Live security feedback while typing. The server re-checks on save, so this is
 * purely advisory and failures are ignored.
 */
export const useScriptValidation = (script: string, { enabled }: { enabled: boolean }) => {
  const api = useCronApi();
  const [result, setResult] = useState<SecurityCheckResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setResult(null);
      return;
    }
    let cancelled = false;
    setIsValidating(true);
    const timer = setTimeout(async () => {
      try {
        const next = await api.validateScript(script);
        if (!cancelled) setResult(next);
      } catch {
        // advisory only
      } finally {
        if (!cancelled) setIsValidating(false);
      }
    }, VALIDATION_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [script, enabled, api]);

  return { result, isValidating, setResult };
};
