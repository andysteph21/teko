// R3 — devis → confirmation → attente (compte à rebours, relecture toutes
// les 3 s, arrêtée dès l'issue) → accepté / refusé / expiré.

import { act, renderHook } from "@testing-library/react-native";

const mockQuote = jest.fn();
const mockRequest = jest.fn();
const mockLatest = jest.fn();
jest.mock("@teko/api-client", () => ({
  ...jest.requireActual("@teko/api-client"),
  getRouteChangeQuote: (...args: unknown[]) => mockQuote(...args),
  requestRouteChange: (...args: unknown[]) => mockRequest(...args),
  latestRouteChange: (...args: unknown[]) => mockLatest(...args),
}));
jest.mock("../../lib/supabase", () => ({ supabase: {} }));

import { TekoApiError } from "@teko/api-client";
import { useRouteChangeSignal } from "./route-change-signal";
import { EXPIRY_GRACE_MS, MAX_STOPS, POLL_MS, useRouteChange } from "./use-route-change";

const DEST = { position: { lon: 9.47, lat: 0.41 }, label: "Aéroport", landmarkId: "lm-2" };
const STOP = { position: { lon: 9.46, lat: 0.405 }, label: "Pharmacie" };
const QUOTED = { id: "chg-1", status: "quoted", old_price: 1500, new_price: 2100 };
const PENDING = {
  ...QUOTED,
  status: "pending",
  requested_at: "2026-11-23T10:00:00.000Z",
  respond_by: "2026-11-23T10:00:30.000Z",
};

async function advance(ms: number) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
}

async function toPending() {
  const hook = renderHook(() => useRouteChange("ride-1", DEST));
  await act(() => hook.result.current.requestQuote());
  await act(() => hook.result.current.confirm());
  return hook;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  useRouteChangeSignal.setState({ version: 0 });
  mockQuote.mockResolvedValue(QUOTED);
  mockRequest.mockResolvedValue(PENDING);
  mockLatest.mockResolvedValue(PENDING);
});
afterEach(() => jest.useRealTimers());

describe("brouillon et devis", () => {
  it("borne les arrêts à deux et envoie destination + arrêts au devis", async () => {
    const hook = renderHook(() => useRouteChange("ride-1", DEST));
    act(() => {
      for (let i = 0; i <= MAX_STOPS; i++) hook.result.current.addStop(STOP);
    });
    expect(hook.result.current.stops).toHaveLength(2);
    expect(hook.result.current.canAddStop).toBe(false);
    act(() => hook.result.current.removeStop(0));

    await act(() => hook.result.current.requestQuote());
    expect(mockQuote).toHaveBeenCalledWith(
      {},
      {
        rideId: "ride-1",
        destination: { position: DEST.position, landmarkId: "lm-2", hint: "Aéroport" },
        stops: [{ position: STOP.position, landmarkId: undefined, hint: "Pharmacie" }],
      },
    );
    expect(hook.result.current.phase).toBe("quoted");
    expect(hook.result.current.quote).toBe(QUOTED);
  });

  it("un refus du devis reste au brouillon avec le message du code", async () => {
    mockQuote.mockRejectedValue(new TekoApiError("route_too_many_changes", "TOO_MANY_CHANGES"));
    const hook = renderHook(() => useRouteChange("ride-1", DEST));
    await act(() => hook.result.current.requestQuote());
    expect(hook.result.current.phase).toBe("edit");
    expect(hook.result.current.errorKey).toBe("ride:modification.erreurs.route_too_many_changes");
  });

  it("sans destination, aucun devis n'est demandé", async () => {
    const hook = renderHook(() => useRouteChange("ride-1", null));
    await act(() => hook.result.current.requestQuote());
    expect(mockQuote).not.toHaveBeenCalled();
    expect(hook.result.current.errorKey).toBe("ride:modification.erreurs.destination_requise");
  });
});

describe("attente de la réponse du chauffeur", () => {
  it("compte à rebours de 30 s puis acceptation : relecture arrêtée, suivi prévenu", async () => {
    const hook = await toPending();
    expect(mockRequest).toHaveBeenCalledWith({}, "chg-1");
    expect(hook.result.current.phase).toBe("pending");
    expect(hook.result.current.secondsLeft).toBe(30);

    await advance(POLL_MS);
    expect(mockLatest).toHaveBeenCalledTimes(1);
    expect(hook.result.current.secondsLeft).toBe(27);
    expect(hook.result.current.phase).toBe("pending");

    mockLatest.mockResolvedValue({ ...PENDING, status: "accepted" });
    await advance(POLL_MS);
    expect(hook.result.current.phase).toBe("accepted");
    expect(useRouteChangeSignal.getState().version).toBe(1);

    await advance(POLL_MS * 3);
    expect(mockLatest).toHaveBeenCalledTimes(2);
  });

  it.each(["refused", "expired"] as const)(
    "issue %s : la course continue inchangée",
    async (status) => {
      mockLatest.mockResolvedValue({ ...PENDING, status });
      const hook = await toPending();
      await advance(POLL_MS);
      expect(hook.result.current.phase).toBe(status);
      expect(useRouteChangeSignal.getState().version).toBe(0);
      await advance(POLL_MS * 2);
      expect(mockLatest).toHaveBeenCalledTimes(1);
    },
  );

  it("silence du serveur après l'échéance : expiré localement, relecture arrêtée", async () => {
    const hook = await toPending();
    await advance(30_000 + EXPIRY_GRACE_MS + POLL_MS);
    expect(hook.result.current.phase).toBe("expired");
    expect(hook.result.current.secondsLeft).toBe(0);
    const calls = mockLatest.mock.calls.length;
    await advance(POLL_MS * 2);
    expect(mockLatest).toHaveBeenCalledTimes(calls);
  });

  it("une panne réseau pendant l'attente ne conclut rien", async () => {
    mockLatest.mockRejectedValue(new TekoApiError("network", "fetch failed"));
    const hook = await toPending();
    await advance(POLL_MS * 2);
    expect(hook.result.current.phase).toBe("pending");
  });

  it("la réponse d'une autre modification est ignorée", async () => {
    mockLatest.mockResolvedValue({ ...PENDING, id: "chg-0", status: "refused" });
    const hook = await toPending();
    await advance(POLL_MS);
    expect(hook.result.current.phase).toBe("pending");
  });

  it("refus de la confirmation (déjà traitée) : retour au devis avec message", async () => {
    mockRequest.mockRejectedValue(new TekoApiError("route_change_handled", "déjà traitée"));
    const hook = renderHook(() => useRouteChange("ride-1", DEST));
    await act(() => hook.result.current.requestQuote());
    await act(() => hook.result.current.confirm());
    expect(hook.result.current.phase).toBe("quoted");
    expect(hook.result.current.errorKey).toBe("ride:modification.erreurs.route_change_handled");
  });
});
