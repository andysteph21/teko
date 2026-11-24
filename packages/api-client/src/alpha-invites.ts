import type { TableRow } from "@teko/types";
import type { TekoClient } from "./client";
import { unwrap } from "./errors";

export async function listAlphaInvites(client: TekoClient): Promise<TableRow<"alpha_invites">[]> {
  return unwrap(
    await client
      .from("alpha_invites")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000),
  );
}

/** Invitation par e-mail vérifié (décision A4 du 23 novembre 2026). */
export async function setAlphaInviteEmail(
  client: TekoClient,
  input: { email: string; role: "client" | "driver"; active: boolean },
): Promise<TableRow<"alpha_invites">> {
  return unwrap(
    await client.rpc("invite_alpha_email", {
      p_email: input.email,
      p_role: input.role,
      p_active: input.active,
    }),
  );
}

export async function setAlphaInvite(
  client: TekoClient,
  input: {
    phone: string;
    role: "client" | "driver";
    active: boolean;
  },
): Promise<TableRow<"alpha_invites">> {
  return unwrap(
    await client.rpc("invite_alpha", {
      p_phone: input.phone,
      p_role: input.role,
      p_active: input.active,
    }),
  );
}
