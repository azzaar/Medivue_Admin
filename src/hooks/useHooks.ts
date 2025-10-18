// hooks/useChoices.ts
import { useEffect, useState } from "react";
import { useDataProvider, useNotify } from "react-admin";

export interface Choice { id: string; name: string }

export function useChoices(resource: "doctors" | "patients", perPage = 1000) {
  const dp = useDataProvider();
  const notify = useNotify();
  const [choices, setChoices] = useState<Choice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await dp.getList<Choice>(resource, {
          pagination: { page: 1, perPage },
          sort: { field: "name", order: "ASC" },
          filter: {},
        });
        if (mounted) setChoices((res.data ?? []).map(r => ({ id: r.id, name: (r).name })));
      } catch (e) {
        const err = e as Error;
        notify(err.message || `Failed to load ${resource}`, { type: "error" });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [dp, notify, resource, perPage]);

  return { choices, loading };
}
