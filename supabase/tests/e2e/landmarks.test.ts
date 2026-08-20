// Repères collaboratifs : proposition citoyenne → validation admin (carto) →
// visibilité dans la recherche de proximité.

import { beforeAll, describe, expect, it } from "vitest";
import {
  type TestUser,
  createUser,
  point,
  serviceSql,
} from "./helpers";

let nadia: TestUser;
let carto: TestUser;

beforeAll(async () => {
  nadia = await createUser();
  carto = await createUser({ role: "admin", adminRole: "carto" });
});

describe("repères collaboratifs", () => {
  const spot = point(9.4612, 0.4101);
  let proposalId: string;

  it("nearest_landmarks retourne les repères seed autour de Mont-Bouët", async () => {
    const { data, error } = await nadia.client.rpc("nearest_landmarks", {
      p_point: point(9.457, 0.399),
      p_max_m: 400,
    });
    expect(error).toBeNull();
    expect(data.map((l: { name: string }) => l.name)).toContain(
      "Marché de Mont-Bouët",
    );
  });

  it("Nadia propose « Boulangerie d'Akébé » → statut proposed", async () => {
    const { data, error } = await nadia.client.rpc("propose_landmark", {
      p_name: "Boulangerie d'Akébé",
      p_category: "other",
      p_point: spot,
    });
    expect(error).toBeNull();
    proposalId = data.id;
    expect(data.status).toBe("proposed");
    expect(data.proposed_by).toBe(nadia.id);
  });

  it("un client ne peut pas valider une proposition", async () => {
    const { error } = await nadia.client.rpc("validate_landmark_proposal", {
      p_proposal: proposalId,
      p_accept: true,
    });
    expect(error).not.toBeNull();
  });

  it("l'admin carto valide → le repère devient cherchable par tous", async () => {
    const { error } = await carto.client.rpc("validate_landmark_proposal", {
      p_proposal: proposalId,
      p_accept: true,
    });
    expect(error).toBeNull();

    const st = await serviceSql(
      `select p.status as p_status, p.reviewed_by, l.status as l_status
         from public.landmark_proposals p
         join public.landmarks l on l.id = p.landmark_id
        where p.id = $1`,
      [proposalId],
    );
    expect(st.rows[0].p_status).toBe("merged"); // proposition fusionnée…
    expect(st.rows[0].l_status).toBe("validated"); // …dans un repère validé
    expect(st.rows[0].reviewed_by).toBe(carto.id);

    const { data } = await nadia.client.rpc("nearest_landmarks", {
      p_point: spot,
      p_max_m: 200,
    });
    expect(data.map((l: { name: string }) => l.name)).toContain(
      "Boulangerie d'Akébé",
    );
  });

  // ÉCART E-17 : « vous serez notifiée du résultat » (C-26/C-31) n'est pas
  // implémenté — validate_landmark_proposal ne poste aucune notification.
  it.fails("désiré : le proposant est notifié du résultat (écart E-17)", async () => {
    const notif = await serviceSql(
      `select type from public.notifications where user_id = $1`,
      [nadia.id],
    );
    expect(notif.rows.length).toBeGreaterThan(0);
  });
});
