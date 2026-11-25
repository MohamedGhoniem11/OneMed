import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Tiny `q` query-param state helper. Pages can adopt it later to share the
 * shell's search text without owning their own URL plumbing.
 */
export type SetSearchParam = (value: string, options?: { replace?: boolean }) => void;

export function useSearchParam(key = 'q'): [string, SetSearchParam] {
  const [params, setParams] = useSearchParams();
  const value = params.get(key) ?? '';
  const setValue = useCallback<SetSearchParam>((next, options) => {
    setParams(
      (previous) => {
        const updated = new URLSearchParams(previous);
        if (next) updated.set(key, next);
        else updated.delete(key);
        return updated;
      },
      { replace: options?.replace ?? false },
    );
  }, [key, setParams]);
  return [value, setValue];
}

export default useSearchParam;
