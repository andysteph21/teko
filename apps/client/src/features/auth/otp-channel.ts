// Canal du code de connexion (décision du 23 novembre 2026) : l'e-mail est
// mis en avant ; le numéro reste accepté pour les comptes existants et pour
// l'option SMS le jour où un prestataire sera activé.

import {
  type Session,
  signInWithEmailOtp,
  signInWithPhoneOtp,
  verifyEmailOtp,
  verifyPhoneOtp,
} from "@teko/api-client";
import { supabase } from "../../lib/supabase";

export interface OtpChannel {
  kind: "email" | "phone";
  /** Adresse ou numéro affiché à l'utilisateur. */
  target: string;
  send: () => Promise<void>;
  verify: (code: string) => Promise<Session>;
}

export function isValidEmail(value: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim());
}

/** Numéro national gabonais : 8 chiffres ; les numéros de test en font 9. */
export function isValidGabonNational(digits: string): boolean {
  return /^\d{8,9}$/.test(digits);
}

export function otpChannel(params: { email?: string; phone?: string }): OtpChannel | null {
  const { email, phone } = params;
  if (email) {
    return {
      kind: "email",
      target: email,
      send: () => signInWithEmailOtp(supabase, email),
      verify: (code) => verifyEmailOtp(supabase, email, code),
    };
  }
  if (phone) {
    return {
      kind: "phone",
      target: phone,
      send: () => signInWithPhoneOtp(supabase, phone),
      verify: (code) => verifyPhoneOtp(supabase, phone, code),
    };
  }
  return null;
}
