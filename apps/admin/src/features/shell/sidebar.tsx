"use client";

// Barre latérale desktop (216 px, brand-900) — maquette A-02.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon } from "./icons";
import { NAV_ITEMS, type NavBadges } from "./nav";
import { ADMIN_ROLE_LABELS, type AdminProfile } from "./use-admin-profile";

interface SidebarProps {
  profile: AdminProfile | null;
  badges?: NavBadges;
  onSignOut: () => void;
}

export function Sidebar({ profile, badges, onSignOut }: SidebarProps) {
  const pathname = usePathname();
  return (
    <aside className="hidden w-[216px] flex-none flex-col bg-brand-900 px-3 py-4 text-neutral-0 lg:flex">
      <div className="flex items-center gap-2.5 px-2 pb-4 text-[17px] font-black">
        <span className="flex h-8 w-8 items-center justify-center rounded-full border-[2.5px] border-neutral-0 text-base">
          T
        </span>
        Teko Admin
      </div>
      <nav className="flex flex-col gap-0.5" aria-label="Navigation principale">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          const count = item.badge ? badges?.[item.badge] : undefined;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13.5px] ${
                active
                  ? "bg-neutral-0/15 font-bold text-neutral-0"
                  : "font-medium text-brand-100 hover:bg-neutral-0/10"
              }`}
            >
              <NavIcon name={item.icon} />
              {item.label}
              {count ? (
                <span className="ml-auto rounded-full bg-warning px-1.5 py-px text-[10.5px] font-extrabold text-brand-900">
                  {count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto rounded-xl bg-neutral-0/10 p-2.5 text-xs">
        <strong className="block text-[12.5px]">{profile?.full_name ?? "—"}</strong>
        <span className="text-[11px] font-bold uppercase tracking-wide text-driver-accent">
          Rôle · {profile?.admin_role ? ADMIN_ROLE_LABELS[profile.admin_role] : "—"}
        </span>
        <button
          type="button"
          onClick={onSignOut}
          className="mt-2 flex items-center gap-1.5 text-[11.5px] font-semibold text-brand-100 hover:text-neutral-0"
        >
          <NavIcon name="logout" size={13} />
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}
