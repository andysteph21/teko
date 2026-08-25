"use client";

// Coquille de la console : garde d'accès (session + rôle admin) puis
// composition latérale desktop / barre basse mobile. La sécurité réelle est
// la RLS ; ici on évite seulement d'afficher une console vide à un non-admin.

import { signOut } from "@teko/api-client";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { BottomNav } from "./bottom-nav";
import { Sidebar } from "./sidebar";
import { useAdminProfile } from "./use-admin-profile";
import { useNavBadges } from "./use-nav-badges";
import { useSession } from "./use-session";

function CenteredNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-8 text-sm text-neutral-500">
      {children}
    </div>
  );
}

export function ConsoleShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { session, loading: sessionLoading } = useSession();
  const { profile, isAdmin, loading: profileLoading } = useAdminProfile(session?.user.id);
  const badges = useNavBadges(isAdmin);

  useEffect(() => {
    if (!sessionLoading && !session) router.replace("/login");
  }, [sessionLoading, session, router]);

  if (sessionLoading || (session && profileLoading)) {
    return <CenteredNote>Chargement de la console…</CenteredNote>;
  }
  if (!session) return null;
  if (!isAdmin) {
    return (
      <CenteredNote>
        <div className="text-center">
          <p className="mb-3 font-semibold text-neutral-700">Accès réservé à l'équipe Teko.</p>
          <button
            type="button"
            className="font-semibold text-brand-800 underline"
            onClick={async () => {
              await signOut(supabase);
              router.replace("/login");
            }}
          >
            Se déconnecter
          </button>
        </div>
      </CenteredNote>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        profile={profile}
        badges={badges}
        onSignOut={async () => {
          await signOut(supabase);
          router.replace("/login");
        }}
      />
      <main className="min-w-0 flex-1 pb-16 lg:pb-0">{children}</main>
      <BottomNav badges={badges} />
    </div>
  );
}
