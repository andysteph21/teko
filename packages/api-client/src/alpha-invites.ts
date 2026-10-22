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
