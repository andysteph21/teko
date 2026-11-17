import { useCallback, useEffect, useRef, useState } from "react";

export async function withLocationDeadline<T>(fix: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fix,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Délai GPS dépassé")), 12_000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/** Une lecture au montage, puis des lectures explicites sans concurrence. */
export function useLocationRefresh<T>(
  load: (manual: boolean) => Promise<T | null>,
  apply: (result: T, manual: boolean) => void,
  onFailure: () => void,
) {
  const [position, setPosition] = useState<T | null>(null);
  const [busy, setBusy] = useState(false);
  const active = useRef(false);
  const pending = useRef(false);
  const refresh = useCallback(
    async (manual: boolean) => {
      if (pending.current) return;
      pending.current = true;
      setBusy(true);
      try {
        const result = await load(manual);
        if (!active.current || result === null) return;
        apply(result, manual);
        setPosition(result);
      } catch {
        if (manual && active.current) onFailure();
      } finally {
        pending.current = false;
        if (active.current) setBusy(false);
      }
    },
    [load, apply, onFailure],
  );
  useEffect(() => {
    active.current = true;
    void refresh(false);
    return () => {
      active.current = false;
    };
  }, [refresh]);
  return { position, busy, refresh: () => void refresh(true) };
}
