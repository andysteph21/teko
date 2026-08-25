// Indice réseau pour resolveMapMode — NetInfo (RN) traduit vers le
// NetworkHint pur de @teko/maps (même logique que le web/navigator.connection).

import NetInfo from "@react-native-community/netinfo";
import type { NetworkHint } from "@teko/maps";

export async function fetchNetworkHint(): Promise<NetworkHint> {
  const state = await NetInfo.fetch();
  if (state.type === "cellular") {
    const generation = state.details.cellularGeneration;
    if (generation === "2g") return { effectiveType: "2g" };
    if (generation === "3g") return { effectiveType: "3g" };
    return { effectiveType: "4g" };
  }
  return {};
}
