"use client";

// AM-07 « Plus » — menu mobile : liens de gestion, sections superadmin en
// lecture, session (déconnexion) et invite PWA. Grandes cibles tactiles.

import { signOut } from "@teko/api-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { supabase } from "../../lib/supabase";
import { ADMIN_ROLE_LABELS } from "../shell/use-admin-profile";
import { initials } from "../users/format-date";
import { useAdminRole } from "./use-admin-role";

export function MoreMenu() {
  return (
    <div className="mx-auto flex max-w-[520px] flex-col">
      <ProfileBar />
      <div className="flex flex-col px-4 pb-6">
        <SectionTitle>Gestion</SectionTitle>
        <Group>
          <MenuLink
            href="/users"
            title="Utilisateurs & litiges"
            hint="Recherche, fiches, suspensions motivées"
          />
          <MenuLink
            href="/settings?tab=journal"
            title="Journal d'audit"
            hint="Lecture et filtres — export sur ordinateur"
          />
        </Group>
        <SectionTitle>Réservé au superadmin</SectionTitle>
        <Group>
          <MenuLink
            href="/settings?tab=parametres"
            title="Paramètres de la plateforme"
            hint="Lecture seule sur mobile — modification sur ordinateur (double confirmation)"
            badge="Lecture"
          />
          <MenuLink
            href="/settings?tab=equipe"
            title="Équipe & rôles"
            hint="Lecture + renvoi d'invitation ; changements de rôle sur ordinateur"
            badge="Lecture"
          />
        </Group>
        <SectionTitle>Session</SectionTitle>
        <SessionGroup />
        <PwaCard />
      </div>
    </div>
  );
}

function ProfileBar() {
  const { profile, adminRole } = useAdminRole();
  return (
    <div className="flex items-center gap-3 bg-brand-900 px-4 py-5 text-neutral-0">
      <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full border-2 border-neutral-0/85 bg-neutral-0/15 text-[17px] font-extrabold">
        {initials(profile?.full_name ?? null)}
      </span>
      <div>
        <h1 className="text-[17px] font-extrabold">{profile?.full_name ?? "—"}</h1>
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-driver-accent">
          {adminRole ? ADMIN_ROLE_LABELS[adminRole] : "—"}
        </p>
      </div>
    </div>
  );
}

function SessionGroup() {
  const router = useRouter();
  return (
    <Group>
      <div className="flex items-center gap-3 border-b border-neutral-100 px-3.5 py-3.5">
        <div>
          <h4 className="text-sm font-bold">Notifications push admin</h4>
          <p className="text-[11px] text-neutral-500">
            SOS (toujours) · KYC &gt; 24 h · arriérés · résumé de clôture 04 h — bientôt
          </p>
        </div>
      </div>
      <button
        type="button"
        data-testid="more-signout"
        className="flex w-full items-center gap-3 px-3.5 py-3.5 text-left"
        onClick={async () => {
          await signOut(supabase);
          router.replace("/login");
        }}
      >
        <span className="text-sm font-bold">Se déconnecter</span>
        <span aria-hidden className="ml-auto text-[17px] text-neutral-300">
          ›
        </span>
      </button>
    </Group>
  );
}

function PwaCard() {
  return (
    <div className="mt-3 flex items-center gap-3 rounded-[14px] bg-brand-50 p-3.5">
      <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-xl bg-gradient-to-br from-brand-700 to-client-accent text-[17px] font-black text-neutral-0">
        T
      </span>
      <div>
        <h4 className="text-[13px] font-extrabold text-brand-800">Installer Teko Admin</h4>
        <p className="text-[11px] leading-snug text-neutral-500">
          Ajoutez la console à votre écran d'accueil — plein écran, badge d'alertes, dernières
          données consultables hors connexion.
        </p>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <p className="mb-1.5 ml-1 mt-3 text-[10.5px] font-extrabold uppercase tracking-widest text-neutral-500">
      {children}
    </p>
  );
}

function Group({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-neutral-200 bg-neutral-0 [&>*:last-child]:border-b-0">
      {children}
    </div>
  );
}

interface MenuLinkProps {
  href: string;
  title: string;
  hint: string;
  badge?: string;
}

function MenuLink({ href, title, hint, badge }: MenuLinkProps) {
  return (
    <Link
      href={href}
      data-testid={`more-link-${href.replace(/[/?=]/g, "-")}`}
      className="flex items-center gap-3 border-b border-neutral-100 px-3.5 py-3.5"
    >
      <div className="min-w-0">
        <h4 className="text-sm font-bold">{title}</h4>
        <p className="text-[11px] leading-snug text-neutral-500">{hint}</p>
      </div>
      {badge ? (
        <span className="ml-auto flex-none rounded-full bg-neutral-100 px-2.5 py-1 text-[9.5px] font-extrabold uppercase text-neutral-500">
          {badge}
        </span>
      ) : (
        <span aria-hidden className="ml-auto text-[17px] text-neutral-300">
          ›
        </span>
      )}
    </Link>
  );
}
