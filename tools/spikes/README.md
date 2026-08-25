# Spikes du lot 1 — outillage hôte

Protocoles d'exécution des deux spikes (07-evaluation-stack §6, 06-demarrage §2).
Résultats consignés dans [docs/architecture/11-spikes-lot1.md](../../docs/architecture/11-spikes-lot1.md).

## Spike carte (MapLibre RN)

1. Stack requise : `supabase start` + `docker compose up -d` dans `infra/compose` (Martin :3333).
2. Appareil : `adb reverse tcp:3333 tcp:3333` (+ 8081 Metro, 54321 Supabase).
3. Dev build du client installé, Metro lancé → écran `/dev/map-spike` (lien DEV sur l'accueil).
4. Mesures : compteur « JS x im/s » à l'écran (boucle JS, pire cas), et côté hôte :
   ```bash
   adb shell dumpsys gfxinfo ga.teko.client reset && sleep 30 && adb shell dumpsys gfxinfo ga.teko.client | head -30
   ```
   (janky frames / total sur la fenêtre de 30 s, percentiles UI.)

## Spike Realtime (arrière-plan / écran verrouillé)

1. Course de test au nom du compte connecté sur l'appareil :
   ```bash
   ./seed-ride.sh            # crée une course started client 0001 / chauffeur 0002
   ```
2. Sur l'appareil (connecté en +24107000001) : écran `/dev/realtime-spike` — s'abonne
   à la dernière course et journalise chaque position (logcat, préfixe `[spike-rt]`).
3. Pousser des positions côté hôte (1/s) :
   ```bash
   ./push-positions.sh <ride_id> 120   # 120 s de positions
   ```
4. Scénario : 30 s écran allumé → `adb shell input keyevent 26` (verrouillage) →
   60 s verrouillé → keyevent 224 + déverrouillage → 30 s. Analyse :
   ```bash
   adb logcat -d | grep "spike-rt"
   ```
   Regarder : latences en éveil, silence/reprise pendant le verrouillage, rattrapage au réveil.
