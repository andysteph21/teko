-- ============================================================================
-- Teko — Numéro de versement Airtel du chauffeur (D-07/D-18) : distinct du
-- numéro de compte si besoin. Les versements (resolveMsisdn) le préfèrent,
-- repli sur profiles.phone. MVP : modifiable par le chauffeur ; la double
-- vérification (OTP + micro-versement, parcours J) durcira l'écriture.
-- ============================================================================

alter table public.drivers add column if not exists payout_msisdn text;
