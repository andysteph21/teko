// Désactivation auth des comptes purgés — logique pure, testable sans base.
// Un compte purgé côté métier (profiles.deleted_at) dont l'identité GoTrue
// est encore vivante reste utilisable : ce handler soft-delete chaque
// identité en attente (idempotent : la liste ne contient que les restes).
// Une erreur sur un compte n'arrête pas les autres — elle est remontée.

export interface PurgeDeps {
  /** Identifiants renvoyés par le RPC pending_auth_purges(). */
  listPending(): Promise<string[]>;
  /** Soft-delete GoTrue ; renvoie le message d'erreur, ou null si ok. */
  deactivate(userId: string): Promise<string | null>;
}

export interface PurgeFailure {
  id: string;
  reason: string;
}

export interface PurgeResult {
  pending: number;
  deactivated: number;
  failed: PurgeFailure[];
}

export async function purgeAuthAccounts(deps: PurgeDeps): Promise<PurgeResult> {
  const ids = await deps.listPending();
  const failed: PurgeFailure[] = [];
  let deactivated = 0;
  for (const id of ids) {
    try {
      const reason = await deps.deactivate(id);
      if (reason) failed.push({ id, reason });
      else deactivated += 1;
    } catch (e) {
      failed.push({ id, reason: String(e) });
    }
  }
  return { pending: ids.length, deactivated, failed };
}
