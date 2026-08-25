"use client";

// Panneau de validation M1 de la console : connexion OTP (numéro de test
// admin 24107000003) puis lecture de données réelles via @teko/api-client.
// Remplacé par A-01 Connexion + A-02 Dashboard au lot 5.

import {
  estimatePrice,
  getProfile,
  type Session,
  signInWithPhoneOtp,
  signOut,
  verifyPhoneOtp,
} from "@teko/api-client";
import { formatXaf } from "@teko/core";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

const DEV_TEST_PHONE = "+24107000003";

interface ProbeData {
  price: number;
  role: string;
}

export function ProbePanel() {
  const [session, setSession] = useState<Session | null>(null);
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ProbeData | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: d }) => setSession(d.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setData(null);
      return;
    }
    Promise.all([
      estimatePrice(supabase, { category: "confort", distanceM: 3190, durationS: 318 }),
      getProfile(supabase, session.user.id),
    ])
      .then(([price, profile]) => setData({ price, role: profile.role }))
      .catch(() => setError("Lecture des données impossible."));
  }, [session]);

  const sendCode = async () => {
    setError(null);
    try {
      await signInWithPhoneOtp(supabase, DEV_TEST_PHONE);
      setStep("code");
    } catch {
      setError("Envoi du code impossible. Stack locale démarrée ?");
    }
  };

  const verify = async () => {
    setError(null);
    try {
      await verifyPhoneOtp(supabase, DEV_TEST_PHONE, code);
    } catch {
      setError("Code incorrect.");
    }
  };

  if (session) {
    return (
      <div className="flex flex-col gap-3">
        <Row label="Session" value={session.user.phone ?? session.user.id} />
        <Row label="Rôle profil" value={data?.role ?? "…"} />
        <Row label="Estimation Confort 3,19 km" value={data ? formatXaf(data.price) : "…"} mono />
        {error ? <p className="text-sm text-error">{error}</p> : null}
        <button
          type="button"
          onClick={() => signOut(supabase)}
          className="self-start text-sm font-semibold text-brand-500"
        >
          Se déconnecter
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {step === "phone" ? (
        <>
          <p className="text-sm text-neutral-500">
            Connexion OTP — numéro de test <span className="font-mono">{DEV_TEST_PHONE}</span>
          </p>
          <button
            type="button"
            onClick={sendCode}
            className="h-12 rounded-2xl bg-brand-800 font-bold text-neutral-0"
          >
            Recevoir le code
          </button>
        </>
      ) : (
        <>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={6}
            inputMode="numeric"
            placeholder="Code (123456 en local)"
            className="h-12 rounded-lg bg-neutral-100 px-4 text-center font-mono tracking-[0.5em]"
          />
          <button
            type="button"
            onClick={verify}
            className="h-12 rounded-2xl bg-brand-800 font-bold text-neutral-0"
          >
            Continuer
          </button>
        </>
      )}
      {error ? <p className="text-sm text-error">{error}</p> : null}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-neutral-100 pb-2">
      <span className="text-sm text-neutral-500">{label}</span>
      <span className={mono ? "font-mono text-lg font-black text-brand-900" : "font-semibold"}>
        {value}
      </span>
    </div>
  );
}
