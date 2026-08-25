"use client";

// Rôle admin de la session courante — n'adapte que l'interface (contrôles
// désactivés + note « Réservé au superadmin ») ; la garde réelle est la RLS.

import { useAdminProfile } from "../shell/use-admin-profile";
import { useSession } from "../shell/use-session";

export function useAdminRole() {
  const { session } = useSession();
  const { profile, adminRole, loading } = useAdminProfile(session?.user.id);
  return {
    profile,
    adminRole,
    isSuperadmin: adminRole === "superadmin",
    loading,
  };
}
