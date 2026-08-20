# Teko — Esquisse des coûts TI (MVP & lancement)

**Créé :** 18 août 2026 · **Statut :** estimation de travail, à affiner avec les réponses client (questions 21/22 notamment) et les premiers devis.
**Périmètre :** coûts d'infrastructure et de services uniquement. Sont **exclus** : prestations/salaires de développement, marketing, frais Airtel Money par transaction (% à négocier — question 11), honoraires juridiques (question 16), opérations terrain (vérification physique KYC, permanence SOS).

Taux : 1 € = 655,957 FCFA (parité fixe XAF/EUR — les estimations en € sont donc stables en FCFA). Les prix en $ sont convertis grossièrement (1 $ ≈ 0,92 €).

## 1. Coûts uniques (démarrage)

| Poste | Montant | Note |
|---|---|---|
| Compte Google Play Console | 25 $ (≈ 15 000 FCFA) | Unique, obligatoire pour publier les 2 apps Android |
| Nom de domaine (teko.ga / .com) | 15–40 €/an | + certificats TLS gratuits (Let's Encrypt) |
| Téléphones Android de test (2–3, entrée de gamme) | 150–300 € | Recommandé : tester sur le matériel réel du marché |
| Compte Apple Developer | *(hors MVP)* 99 $/an | Seulement à l'arrivée d'iOS |
| **Total démarrage** | **≈ 200–400 €** (130 000–260 000 FCFA) | |

## 2. Coûts mensuels par phase

Trois phases : **Développement** (staging, aucune donnée réelle), **Bêta Libreville** (~200 chauffeurs / ~2 000 clients actifs), **Croissance** (~1 000 chauffeurs / ~20 000 clients). Fourchettes volontairement larges.

| Poste | Développement | Bêta Libreville | Croissance | Notes |
|---|---|---|---|---|
| **Supabase** (Postgres, Auth, Realtime, Storage KYC, Edge Functions) | 0–25 € | 25–35 € | 40–100 € | Free tier suffisant en dev ; Pro (~25 $/projet) dès la bêta ; ensuite facturation à l'usage (stockage KYC, bande passante Realtime) |
| **Infra cartographie** (VPS Martin + Valhalla, stockage objet PMTiles, CDN — Scaleway/OVH) | 15–30 € | 40–90 € | 80–200 € | Extract Gabon = petit ; 1 instance en dev, 2 + CDN en prod (blue/green) ; question 22 |
| **Tuiles de repli** (MapTiler ou Stadia) | 0 € | 0–25 € | 25–90 € | Free tier en dev ; ne sert qu'en secours si le self-hosted est sain |
| **SMS OTP** ⚠ poste le plus variable | ≈ 0 € | 60–150 € | 400–1 000 € | Hypothèse 40–70 FCFA/SMS (agrégateur international) ; ~1 500–2 000 SMS/mois en bêta, 10 000+ en croissance ; **un accord local peut diviser ce poste par 2 à 4** — question 21 |
| **EAS** (builds cloud + mises à jour OTA) | 0 € | 18 € | 18–90 € | Free tier limité en dev ; plan Production recommandé dès les OTA réguliers |
| **Monitoring / erreurs** (Sentry ou équivalent) | 0 € | 0–25 € | 25 € | Free tier généreux au début |
| **E-mail pro & outils** (3–5 comptes) | 0–18 € | 18 € | 30 € | Workspace/Zoho ; nécessaire pour support@ et le repli e-mail OTP |
| **Notifications push (FCM)** | 0 € | 0 € | 0 € | Gratuit |
| **Total mensuel** | **≈ 30–90 €** (20 000–60 000 FCFA) | **≈ 160–360 €** (105 000–235 000 FCFA) | **≈ 590–1 535 €** (390 000–1 000 000 FCFA) | |

## 3. Lecture

- **L'infrastructure est bon marché ; le SMS est le vrai poste.** À la croissance, l'OTP peut représenter à lui seul les deux tiers de la facture TI. C'est pourquoi la question 21 (fournisseur SMS) est bloquante et mérite une vraie négociation — et pourquoi le repli e-mail OTP (MVP) et la session persistante (peu de reconnexions) sont aussi des décisions d'économie.
- **Les frais Airtel Money ne sont pas ici** : ce sont des frais par transaction (pourcentage négocié via l'accord marchand, question 11) — un coût variable sur le volume d'affaires, pas un abonnement TI. À modéliser dans le business plan, pas dans ce document.
- **La parité XAF/EUR fixe** rend ces estimations stables en FCFA ; seuls les services facturés en $ (Supabase, EAS, Sentry, Google) portent un léger risque de change.
- **Leviers d'économie** par ordre d'impact : (1) accord SMS local ou routage au moindre coût ; (2) sobriété data native de Teko = moins d'egress CDN/Realtime que la moyenne du secteur ; (3) builds EAS en local pendant le dev ; (4) rester sur les free tiers tant que le staging n'a pas de données réelles.

## 4. Ce que ça donne en cumulé (ordre de grandeur)

- **Phase développement (≈ 4 mois)** : 200–400 € de démarrage + 4 × 30–90 € ≈ **320–760 €** au total (210 000–500 000 FCFA).
- **Première année de service** (6 mois bêta + 6 mois croissance, hors SMS négocié) : ≈ **4 500–11 500 €** (3–7,5 M FCFA) — dont la moitié environ pour les SMS si rien n'est négocié.

À réviser dès les réponses aux questions 21/22 et le premier devis SMS/hébergeur.
