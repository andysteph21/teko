// Sections des paramètres D-19 : carte collaborative (consentement GPS),
// données (mode éco 3 états + consommation), préférences et sortie —
// copie fidèle de la maquette, interrupteurs en teal chauffeur.

import { color } from "@teko/ui";
import { useTranslation } from "react-i18next";
import { Alert, Switch, View } from "react-native";
import { useDataUsage } from "./data-mode";
import { MapModeSelector } from "./mode-selector";
import { Group, Row, RowValue, SectionLabel } from "./rows";

const TRACK = { false: color.neutral[200], true: color.role.driver.accent };

export interface CollabSectionProps {
  consent: boolean;
  consentReady: boolean;
  onToggleConsent: (next: boolean) => void;
}

export function CollabSection({ consent, consentReady, onToggleConsent }: CollabSectionProps) {
  const { t } = useTranslation();
  return (
    <>
      <SectionLabel>{t("account:parametres.secCarte")}</SectionLabel>
      <Group>
        <Row
          title={t("account:parametres.gpsTitre")}
          subtitle={t("account:parametres.gpsTexte")}
          right={
            <Switch
              value={consent}
              disabled={!consentReady}
              onValueChange={onToggleConsent}
              trackColor={TRACK}
              thumbColor={color.neutral[0]}
              testID="gps-switch"
            />
          }
        />
        <Row
          title={t("account:parametres.repereTitre")}
          subtitle={t("account:parametres.repereSous")}
          onPress={() =>
            Alert.alert(t("account:parametres.repereTitre"), t("account:parametres.repereTexte"))
          }
          testID="settings-landmark"
        />
      </Group>
    </>
  );
}

export function DataSection() {
  const { t } = useTranslation();
  const usage = useDataUsage();
  return (
    <>
      <SectionLabel>{t("account:parametres.secDonnees")}</SectionLabel>
      <Group>
        <View>
          <Row
            title={t("account:parametres.modeTitre")}
            subtitle={t("account:parametres.modeSous")}
            right={<View />}
          />
          <MapModeSelector />
        </View>
        <Row
          title={t("account:parametres.consoTitre")}
          right={
            <RowValue testID="data-usage">
              {t("account:parametres.consoValeur", { quantite: usage.quantityText })}
            </RowValue>
          }
        />
      </Group>
    </>
  );
}

export function PrefsSection() {
  const { t } = useTranslation();
  return (
    <>
      <SectionLabel>{t("account:parametres.secPreferences")}</SectionLabel>
      <Group>
        <Row
          title={t("account:parametres.langue")}
          right={<RowValue>{t("account:parametres.langueValeur")}</RowValue>}
        />
        <Row
          title={t("account:parametres.notifications")}
          // TODO : centre de notifications chauffeur hors périmètre du lot.
          onPress={() =>
            Alert.alert(
              t("account:parametres.notifications"),
              t("account:parametres.notificationsTexte"),
            )
          }
          testID="settings-notifications"
        />
        <Row
          title={t("account:parametres.contacter")}
          // TODO : écran support dédié hors périmètre MVP — coordonnées au lancement.
          onPress={() =>
            Alert.alert(t("account:parametres.contacter"), t("account:parametres.contacterTexte"))
          }
          testID="settings-contact"
        />
      </Group>
    </>
  );
}

export interface ExitSectionProps {
  onSignOut: () => void;
  onDelete: () => void;
}

export function ExitSection({ onSignOut, onDelete }: ExitSectionProps) {
  const { t } = useTranslation();
  return (
    <>
      <SectionLabel>{t("account:parametres.secSortie")}</SectionLabel>
      <Group>
        <Row
          title={t("account:parametres.deconnecter")}
          onPress={onSignOut}
          testID="settings-signout"
        />
        <Row
          title={t("account:parametres.supprimer")}
          subtitle={t("account:parametres.supprimerSous")}
          danger
          onPress={onDelete}
          testID="settings-delete"
        />
      </Group>
    </>
  );
}
