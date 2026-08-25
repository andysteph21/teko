"use client";

// Carte de connexion A-01 : numéro → code SMS (mêmes RPC que les mobiles).

import { signInWithPhoneOtp, TekoApiError, verifyPhoneOtp } from "@teko/api-client";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { supabase } from "../../lib/supabase";

const DEV_DEFAULT_NATIONAL = process.env.NODE_ENV === "development" ? "07000003" : "";

function isValidGabonNational(value: string): boolean {
  return /^\d{8,9}$/.test(value.replace(/\s+/g, ""));
}

export function LoginCard() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [national, setNational] = useState(DEV_DEFAULT_NATIONAL);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const msisdn = `+241${national.replace(/\s+/g, "")}`;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (step === "phone") {
        await signInWithPhoneOtp(supabase, msisdn);
        setStep("otp");
      } else {
        await verifyPhoneOtp(supabase, msisdn, code.trim());
        router.replace("/dashboard");
      }
    } catch (caught) {
      setError(
        caught instanceof TekoApiError && caught.code === "network"
          ? "Connexion impossible. Vérifiez le réseau."
          : "Échec de la vérification. Réessayez.",
      );
    } finally {
      setBusy(false);
    }
  }

  const valid = step === "phone" ? isValidGabonNational(national) : code.trim().length === 6;

  return (
    <form
      onSubmit={submit}
      className="w-[380px] max-w-full rounded-[20px] border border-neutral-200 bg-neutral-0 p-8 shadow-xl"
    >
      <h2 className="mb-1 text-[22px] font-bold text-brand-900">Connexion</h2>
      <p className="mb-6 text-[13.5px] text-neutral-500">
        Accès réservé à l'équipe Teko. Vérification par code SMS.
      </p>
      {step === "phone" ? (
        <>
          <label className="mb-1.5 block text-[13px] font-semibold" htmlFor="phone">
            Numéro de téléphone
          </label>
          <div className="mb-4 flex h-[46px] items-center gap-2.5 rounded-xl bg-neutral-100 px-3.5 text-[15px]">
            <span className="border-r border-neutral-300 pr-2.5 font-semibold">🇬🇦 +241</span>
            <input
              id="phone"
              data-testid="login-phone"
              className="w-full bg-transparent outline-none"
              inputMode="tel"
              autoComplete="tel-national"
              value={national}
              onChange={(e) => setNational(e.target.value)}
            />
          </div>
        </>
      ) : (
        <>
          <label className="mb-1.5 block text-[13px] font-semibold" htmlFor="otp">
            Code reçu au {msisdn}
          </label>
          <input
            id="otp"
            data-testid="login-otp"
            className="mb-4 h-[46px] w-full rounded-xl bg-neutral-100 px-3.5 text-center font-mono text-lg tracking-[0.4em] outline-none"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </>
      )}
      {error ? <p className="mb-3 text-[12.5px] font-semibold text-error">{error}</p> : null}
      <button
        type="submit"
        data-testid="login-submit"
        disabled={!valid || busy}
        className="h-12 w-full rounded-[20px] bg-gradient-to-br from-brand-700 to-client-accent text-base font-semibold text-neutral-0 shadow-lg shadow-brand-700/35 disabled:opacity-50"
      >
        {step === "phone" ? "Recevoir le code" : "Se connecter"}
      </button>
      <p className="mt-4 text-xs leading-relaxed text-neutral-500">
        Chaque connexion et chaque action sensible sont inscrites au journal d'audit. Les rôles et
        accès sont gérés par un superadmin.
      </p>
    </form>
  );
}
