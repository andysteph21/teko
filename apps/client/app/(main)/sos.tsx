// C-27 — SOS / partage : route en superposition (voile sombre) au-dessus du
// suivi de course. Le contenu vit dans src/features/ride/sos-screen.

import { Stack, useLocalSearchParams } from "expo-router";
import { SosScreen } from "../../src/features/ride/sos-screen";

export default function Sos() {
  const { rideId } = useLocalSearchParams<{ rideId?: string }>();
  return (
    <>
      <Stack.Screen
        options={{
          presentation: "transparentModal",
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <SosScreen rideId={rideId} />
    </>
  );
}
