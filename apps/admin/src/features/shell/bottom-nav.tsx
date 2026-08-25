"use client";

// Barre basse mobile (AM-01→AM-07) — la console de poche.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon } from "./icons";
import { MOBILE_NAV, type NavBadges } from "./nav";

export function BottomNav({ badges }: { badges?: NavBadges }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navigation mobile"
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-neutral-100 bg-neutral-0 pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {MOBILE_NAV.map((item) => {
        const active = pathname.startsWith(item.href);
        const count = item.badge ? badges?.[item.badge] : undefined;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10.5px] font-semibold ${
              active ? "text-brand-800" : "text-neutral-500"
            }`}
          >
            <NavIcon name={item.icon} size={18} />
            {item.label}
            {count ? (
              <span className="absolute right-1/4 top-1 rounded-full bg-warning px-1 text-[9px] font-extrabold text-brand-900">
                {count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
