import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

const controls = vi.hoisted(() => ({
  data: {
    data: {
      receipts: [
        {
          id: "receipt-1",
          kind: "settlement",
          method: "cash",
          reference: "RECU-1",
          driver_id: "driver-1",
          amount: 240,
          status: "pending",
          proof_path: "ops/proof",
        },
      ],
      drivers: [],
      claims: [],
      payouts: [],
    },
    error: null,
  },
  prepare: { mutate: vi.fn(), isPending: false, isSuccess: false, error: null },
  approve: { mutate: vi.fn(), isPending: false, error: null },
  reject: { mutate: vi.fn(), isPending: false, error: null },
  proof: { mutate: vi.fn(), error: null },
}));
vi.mock("./use-manual-receipts", () => ({ useManualReceipts: () => controls }));

import { ManualReceipts } from "./manual-receipts";

beforeEach(() => {
  vi.clearAllMocks();
  controls.proof.mutate.mockImplementation((_path, options) =>
    options.onSuccess("https://private.example/proof"),
  );
});

it("Ops prépare mais ne dispose d'aucun bouton de validation financière", () => {
  render(<ManualReceipts userId="ops" adminRole="ops" />);
  expect(screen.getByText("Préparer pour validation Finance")).toBeDefined();
  expect(screen.queryByText("Valider l’encaissement ou le versement")).toBeNull();
});

it("Finance consulte la preuve et confirme sa vérification avant de valider le dossier exact", async () => {
  render(<ManualReceipts userId="finance" adminRole="finance" />);
  const button = screen.getByText("Valider l’encaissement ou le versement") as HTMLButtonElement;
  expect(button.disabled).toBe(true);
  fireEvent.click(screen.getByText("Consulter le justificatif"));
  expect(controls.proof.mutate).toHaveBeenCalledWith("ops/proof", expect.anything());
  const link = await screen.findByText("Ouvrir la preuve");
  expect(link.getAttribute("href")).toBe("https://private.example/proof");
  expect(button.disabled).toBe(true);
  fireEvent.click(screen.getByRole("checkbox"));
  await waitFor(() => expect(button.disabled).toBe(false));
  fireEvent.click(button);
  expect(controls.approve.mutate).toHaveBeenCalledWith("receipt-1");
});
