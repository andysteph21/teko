// Aiguillage du panneau bas du suivi de course — un panneau par état backend
// (table de synchronisation, parcours chauffeur G-J) : accepted/enroute →
// C-13, arrived → C-13b, started → C-14.

import type { RideRow } from "@teko/types";
import { CoursePanel } from "./course-panel";
import { ApproachPanel, ArrivedPanel } from "./pin-panels";
import type { RideTracking } from "./use-ride-tracking";

export interface RidePanelProps {
  tracking: RideTracking;
  ride: RideRow;
  destinationLabel: string | null;
  sharing: boolean;
  onShare: () => void;
  onCancel: () => void;
}

export function RidePanel(props: RidePanelProps) {
  const { tracking, ride, destinationLabel, sharing, onShare, onCancel } = props;
  if (tracking.status === "arrived") {
    return (
      <ArrivedPanel driverName={tracking.driverName} pin={ride.pin_code} onCancel={onCancel} />
    );
  }
  if (tracking.status === "started") {
    return (
      <CoursePanel
        ride={ride}
        driverName={tracking.driverName}
        destinationLabel={destinationLabel}
        positionStale={tracking.positionStale}
        sharing={sharing}
        onShare={onShare}
      />
    );
  }
  return (
    <ApproachPanel
      driverName={tracking.driverName}
      pin={ride.pin_code}
      etaMin={tracking.etaMin}
      onCancel={onCancel}
    />
  );
}
