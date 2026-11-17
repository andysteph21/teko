"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listAlphaInvites, setAlphaInvite } from "@teko/api-client";
import { type FormEvent, useState } from "react";
import { alphaRequest, privateAlpha } from "../../lib/private-alpha";
import { supabase } from "../../lib/supabase";
import { useAdminProfile } from "../shell/use-admin-profile";
import { useSession } from "../shell/use-session";

const syntheticAccounts = privateAlpha && process.env.NEXT_PUBLIC_TEKO_SYNTHETIC_TESTERS === "true";
const fixedCampaign =
  syntheticAccounts && process.env.NEXT_PUBLIC_TEKO_SYNTHETIC_CAMPAIGN === "true";
const invitationIntro = fixedCampaign
  ? "Les comptes de la campagne sont prêts. Affichez le code du testeur et transmettez-le en privé."
  : syntheticAccounts
    ? "Créez une invitation avec un numéro fictif réservé. Aucun SMS n’est envoyé."
    : "Ajoutez le vrai numéro du participant. L’invitation autorise son inscription et n’envoie aucun SMS.";

type TestInvitation = { phone: string; role: "client" | "driver"; code: string };

function InvitationCredentials({
  credentials,
  hide,
}: {
  credentials: TestInvitation;
  hide: () => void;
}) {
  return (
    <div role="status" className="my-2 rounded border border-neutral-200 p-2 text-sm">
      <p>À envoyer en privé au testeur</p>
      <p>
        <a href="/install" className="underline">
          {window.location.origin}/install
        </a>
      </p>
      <p>Numéro d’essai sur le site · +{credentials.phone}</p>
      <p>Dans l’application · {credentials.phone.slice(3)}</p>
      <p>Code d’essai · {credentials.code}</p>
      <button type="button" className="underline" onClick={hide}>
        Masquer le code
      </button>
    </div>
  );
}

type Invitation = Awaited<ReturnType<typeof listAlphaInvites>>[number];

function InvitedAccounts({
  rows,
  updating,
  provisioning,
  toggle,
  reveal,
}: {
  rows: Invitation[] | undefined;
  updating: boolean;
  provisioning: boolean;
  toggle: (input: { phone: string; role: "client" | "driver"; active: boolean }) => void;
  reveal: (input: Pick<TestInvitation, "phone" | "role">) => void;
}) {
  return (
    <ul className="mt-3 divide-y divide-neutral-100">
      {rows?.map((row) => {
        const account = { phone: row.phone, role: row.role as TestInvitation["role"] };
        return (
          <li key={row.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
            <span>
              +{row.phone} · {row.role === "driver" ? "Chauffeur" : "Passager"} ·{" "}
              {row.is_active ? "Invité" : "Retiré"}
            </span>
            <button
              type="button"
              disabled={updating}
              className="underline"
              onClick={() => toggle({ ...account, active: !row.is_active })}
            >
              {row.is_active ? "Retirer l’invitation" : "Réactiver l’invitation"}
            </button>
            {syntheticAccounts && row.is_active && /^2410000091\d{2}$/.test(row.phone) && (
              <button
                type="button"
                disabled={provisioning}
                className="underline"
                onClick={() => reveal(account)}
              >
                Afficher le code
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function useTestInvitation(token: string | undefined, show: (value: TestInvitation) => void) {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (input: { role: "client" | "driver"; phone?: string }) =>
      alphaRequest<TestInvitation>("testers", input, token),
    onSuccess: (result) => {
      show(result);
      return Promise.all([
        cache.invalidateQueries({ queryKey: ["alpha-invites"] }),
        cache.invalidateQueries({ queryKey: ["admin-profiles"] }),
        cache.invalidateQueries({ queryKey: ["admin-drivers-index"] }),
      ]);
    },
  });
}

function InvitationList() {
  const cache = useQueryClient();
  const { session } = useSession();
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"client" | "driver">("client");
  const [credentials, setCredentials] = useState<TestInvitation | null>(null);
  const query = useQuery({
    queryKey: ["alpha-invites"],
    queryFn: () => listAlphaInvites(supabase),
  });
  const update = useMutation({
    mutationFn: (input: { phone: string; role: "client" | "driver"; active: boolean }) =>
      setAlphaInvite(supabase, input),
    onSuccess: () => {
      setCredentials(null);
      return cache.invalidateQueries({ queryKey: ["alpha-invites"] });
    },
  });
  const provision = useTestInvitation(session?.access_token, setCredentials);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (syntheticAccounts) {
      setCredentials(null);
      provision.mutate({ role });
    } else update.mutate({ phone, role, active: true });
  };
  return (
    <section className="rounded-xl border border-neutral-200 bg-neutral-0 p-4">
      <h2 className="font-bold">Invitations à l’alpha fermée</h2>
      <p className="my-2 text-sm">{invitationIntro}</p>
      {!fixedCampaign && (
        <form onSubmit={submit} className="flex flex-wrap gap-2">
          {!syntheticAccounts && (
            <label>
              Numéro international
              <input
                type="tel"
                required
                placeholder="+241…"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="ml-2 rounded border p-2"
              />
            </label>
          )}
          <label>
            Rôle
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as typeof role)}
              className="ml-2 rounded border p-2"
            >
              <option value="client">Passager</option>
              <option value="driver">Chauffeur</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={update.isPending || provision.isPending}
            className="rounded bg-brand-600 px-3 text-neutral-0"
          >
            {syntheticAccounts ? "Créer une invitation de test" : "Inviter ce numéro"}
          </button>
        </form>
      )}
      {query.error || update.error ? (
        <p role="alert">Invitation non confirmée. Vérifiez le numéro et le réseau.</p>
      ) : null}
      {update.isSuccess ? <p role="status">Liste mise à jour par le serveur.</p> : null}
      {provision.error ? <p role="alert">{provision.error.message}</p> : null}
      {credentials && (
        <InvitationCredentials credentials={credentials} hide={() => setCredentials(null)} />
      )}
      <InvitedAccounts
        rows={query.data}
        updating={update.isPending}
        provisioning={provision.isPending}
        toggle={update.mutate}
        reveal={(account) => {
          setCredentials(null);
          provision.mutate(account);
        }}
      />
    </section>
  );
}

export function AlphaInvitations() {
  const { session } = useSession();
  const { adminRole } = useAdminProfile(session?.user.id);
  return adminRole === "ops" || adminRole === "superadmin" ? <InvitationList /> : null;
}
