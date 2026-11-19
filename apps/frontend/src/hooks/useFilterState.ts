import { useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";

export function useFilterState<T extends Record<string, string>>(initialValues: T) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Compute current resolved filters from URL params or fallback to initial defaults
  const filters = useMemo(() => {
    const current = { ...initialValues };
    for (const key of Object.keys(initialValues) as Array<keyof T>) {
      const urlVal = searchParams.get(key as string);
      if (urlVal !== null) {
        current[key] = urlVal as T[keyof T];
      }
    }
    return current;
  }, [searchParams, initialValues]);

  // Set or clear a single filter param
  const setFilter = useCallback(
    (key: keyof T, value: string | undefined | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const strKey = String(key);
          const defaultVal = initialValues[key];

          if (value === undefined || value === null || value === "" || value === defaultVal) {
            next.delete(strKey);
          } else {
            next.set(strKey, String(value));
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams, initialValues]
  );

  // Set multiple filter params at once
  const setFilters = useCallback(
    (patch: Partial<T>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            const defaultVal = initialValues[k];
            if (v === undefined || v === null || v === "" || v === defaultVal) {
              next.delete(k);
            } else {
              next.set(k, String(v));
            }
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams, initialValues]
  );

  // Reset all filters back to initial state
  const resetFilters = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const k of Object.keys(initialValues)) {
          next.delete(k);
        }
        return next;
      },
      { replace: true }
    );
  }, [setSearchParams, initialValues]);

  // Convert current active filters to query string for API requests
  const toApiQueryParams = useCallback(
    (overrides?: Partial<T>) => {
      const params = new URLSearchParams();
      const merged = { ...filters, ...(overrides || {}) };

      for (const [k, v] of Object.entries(merged)) {
        if (v && v !== "all" && v !== "") {
          params.set(k, v);
        }
      }
      return params.toString();
    },
    [filters]
  );

  return {
    filters,
    setFilter,
    setFilters,
    resetFilters,
    toApiQueryParams,
  };
}
