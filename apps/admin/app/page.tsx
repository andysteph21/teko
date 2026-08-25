"use client";

// Aiguillage racine : session → tableau de bord, sinon connexion (A-01).

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "../src/features/shell/use-session";

export default function Home() {
  const router = useRouter();
  const { session, loading } = useSession();

  useEffect(() => {
    if (loading) return;
    router.replace(session ? "/dashboard" : "/login");
  }, [loading, session, router]);

  return (
    <main className="flex min-h-screen items-center justify-center text-sm text-neutral-500">
      Console Teko…
    </main>
  );
}
