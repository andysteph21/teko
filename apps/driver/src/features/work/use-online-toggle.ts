// Passage en ligne (toggle D-09) : la permission localisation est demandée au
// moment où elle devient nécessaire — le premier passage en ligne d'une
// installation fraîche. Refusée : le toggle reste hors ligne et le bandeau
// explique quoi faire ; jamais d'« En ligne » sans battements.

import { useWorkStore } from "./store";
import { ensureLocationPermission } from "./use-device-position";

export function useOnlineToggle(): (next: boolean) => void {
  const setOnline = useWorkStore((s) => s.setOnline);
  const setLocationIssue = useWorkStore((s) => s.setLocationIssue);
  return (next) => {
    if (!next) {
      setOnline(false);
      setLocationIssue(null);
      return;
    }
    void ensureLocationPermission().then((permission) => {
      if (permission === "granted") {
        setLocationIssue(null);
        setOnline(true);
      } else {
        setLocationIssue(permission);
      }
    });
  };
}
