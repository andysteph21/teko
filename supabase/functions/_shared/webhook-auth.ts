import { json } from "./http.ts";
import { timingSafeEqual } from "./secure-compare.ts";

/** Un secret absent est une configuration invalide, jamais un accès public. */
export async function authorizeWebhook(req: Request, secret: string | undefined, header: string): Promise<Response | null> {
  if (!secret) return json({ error: "webhook non configuré" }, 503);
  if (!(await timingSafeEqual(req.headers.get(header) ?? "", secret))) return json({ error: "non autorisé" }, 401);
  if (req.method !== "POST") return json({ error: "méthode non autorisée" }, 405);
  return null;
}
