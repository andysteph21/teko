import { onlineManager } from "@tanstack/react-query";
import { createQueryClient } from "./query-client";

it("une commande sans réseau échoue immédiatement et n'est pas rejouée à la reconnexion", async () => {
  const client = createQueryClient();
  const send = jest.fn().mockRejectedValue(new Error("hors réseau"));
  onlineManager.setOnline(false);
  try {
    const mutation = client
      .getMutationCache()
      .build(client, { mutationFn: send, gcTime: Infinity });
    await expect(mutation.execute(undefined)).rejects.toThrow("hors réseau");
    expect(send).toHaveBeenCalledTimes(1);
    expect(mutation.state.isPaused).toBe(false);
    onlineManager.setOnline(true);
    await client.resumePausedMutations();
    expect(send).toHaveBeenCalledTimes(1);
  } finally {
    onlineManager.setOnline(true);
    client.clear();
  }
});
