import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ManualReceiptForm } from "./manual-receipt-form";

const file = new File(["preuve synthétique"], "receipt.pdf", { type: "application/pdf" });
afterEach(() => vi.unstubAllGlobals());
function submittedForm(amount: string, method: string) {
  // Inclut une preuve valide ; le rejet doit porter sur le montant exact saisi.
  vi.stubGlobal(
    "FormData",
    class {
      get(name: string) {
        const values: Record<string, unknown> = {
          amount,
          method,
          proof: file,
          driverId: "driver",
          reference: "RECU-25",
        };
        return values[name];
      }
    },
  );
}
it.each(["cash", "external_transfer"])(
  "refuse le montant précis 250.001 en %s sans préparer ni arrondir la preuve",
  (method) => {
    const submit = vi.fn();
    submittedForm("250.001", method);
    render(
      <ManualReceiptForm drivers={[]} claims={[]} payouts={[]} busy={false} onSubmit={submit} />,
    );
    fireEvent.submit(
      screen.getByRole("button", { name: "Préparer pour validation Finance" }).closest("form")!,
    );
    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("multiple de 25 FCFA");
  },
);
it("transmet le montant exact 275 et la preuve originale sans arrondi", () => {
  const submit = vi.fn();
  submittedForm("275", "external_transfer");
  render(
    <ManualReceiptForm drivers={[]} claims={[]} payouts={[]} busy={false} onSubmit={submit} />,
  );
  fireEvent.submit(
    screen.getByRole("button", { name: "Préparer pour validation Finance" }).closest("form")!,
  );
  expect(submit).toHaveBeenCalledWith(
    expect.objectContaining({ amount: 275, method: "external_transfer", file }),
  );
});
