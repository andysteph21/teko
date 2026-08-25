// A-01 — connexion admin : panneau de marque + carte téléphone/code.

import { LoginCard } from "../../src/features/auth/login-card";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen">
      <section className="hidden w-[520px] flex-none flex-col bg-gradient-to-br from-brand-900 via-brand-700 to-client-accent p-14 text-neutral-0 lg:flex">
        <div className="mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-neutral-0/90 text-[38px] font-black">
          T
        </div>
        <h1 className="mb-2.5 text-[34px] font-black leading-tight tracking-tight">
          Plateforme d'administration
        </h1>
        <p className="max-w-[34ch] text-[15px] leading-relaxed opacity-85">
          Supervision des courses, validation KYC, cartographie collaborative et finances — selon
          votre rôle.
        </p>
        <div className="mt-auto flex flex-wrap gap-2">
          {["Ops", "Cartographie", "Finance", "Superadmin"].map((role) => (
            <span key={role} className="rounded-full bg-neutral-0/15 px-3.5 py-1 text-xs font-bold">
              {role}
            </span>
          ))}
        </div>
      </section>
      <section className="flex flex-1 items-center justify-center p-6">
        <LoginCard />
      </section>
    </main>
  );
}
