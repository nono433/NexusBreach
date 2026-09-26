# Nexus Breach — version brightness

Jeu de tir en vue à la première personne avec vagues de monstres et amélioration d'équipement après chaque vague.

## Progression et équipement

- Quand le joueur meurt, il reçoit des crédits calculés selon la vague, les éliminations, le score, la précision, les headshots, le temps de survie et l’efficacité.
- Les crédits et l’équipement sont sauvegardés dans le navigateur via `localStorage`.
- Le menu **ARCHIVE DE PROGRESSION** permet de télécharger un fichier de sauvegarde JSON et de le restaurer sur le même ordinateur ou sur un autre. La sauvegarde contient les crédits, les armes, les capacités, les modules, le meilleur score et la carte sélectionnée.
- Le bouton **ATELIER // ÉQUIPEMENT** du menu, ou **VISITER L'ATELIER** après une mort, permet d’acheter des bonus permanents.
- Les modules achetés sont automatiquement actifs au début de la prochaine partie. Les améliorations affichées entre les vagues restent temporaires à la partie en cours.
- Deux cartes sont disponibles : **NEXUS** et **FOUNDRY**. La carte sélectionnée est sauvegardée dans le navigateur. Nexus conserve ses quatre mobs standards, tandis que Foundry possède quatre machines personnalisées et plus fortes : **Crawleur de Scorie**, **Rôdeur de Braise**, **Colosse de Laitier** et **Forge-Monarque**.

## Les deux classes

Les classes ne sont plus deux variantes du même jeu : **armes, capacités, améliorations et modules d’atelier sont exclusifs à chaque classe.** L’atelier n’affiche que ce qui est réellement accessible.

### RANGER — tir à distance, contrôle de zone

- **100 PV**, vitesse 6,1. Plus résistant, mais dépend de la portée.
- **8 armes à feu** : AR-9 PULSE (départ), SCATTER-7, NOVA-12, VECTOR-6, FROST-3, LANCE-01, PYRO-4, ARC-9 PLASMA.
- **4 capacités** : NOVA PULSE (dégâts de zone), CRYO FIELD (ralentit 70 %), AEGIS SHIELD (−45 % de dégâts), OVERLOAD CORE (+50 % de dégâts, +60 % de cadence).
- **7 améliorations** exclusives : Canon amplifié, Gâche rapide, Chargeur étendu, Recharge accélérée, Rayons perforants, Nanites réparateurs, Optique de précision.
- **3 modules** d’atelier : Bobine pulsante, Déclencheur surcadencé, Chargeur tactique.

### ASSASSIN — corps à corps, mobilité, exécution

- **84 PV**, vitesse 7,3. Plus rapide et plus fragile : il doit entrer dans la mêlée.
- **5 armes** : LAMES JUMELLES (départ, 2 cibles), LAME SPATULE (1 cible, 108 dégâts), CROCS JUMELS (3 cibles, rapide), SHURIKEN VOLANT (lancer à distance, 9 coups/s), PAS D’OMBRE (la frappe voyage avec le dash).
- **4 capacités** : PAS OMBRE (reset le dash, +50 % de dégâts), VOILE SOMBRE (invisible 1,5 s, la frappe suivante est un headshot garanti), SANG-DÉCHIRÉ (+45 % de dégâts, 6 PV par élimination), HEURE DE CENDRE (ralentit 55 %, 90 dégâts au plus résistant).
- **7 améliorations** exclusives : Lames affûtées, Tempête jumelle, Voile d’ombre, Sang d’Ombre, Sentence, Allonge, Garde d’ombre.
- **3 modules** d’atelier : Fil des lames, Tendon synthétiques, Pacte de sang.

### Partagés par les deux classes

- **3 améliorations** : Exosquelette, Propulseurs, Stabilisateurs.
- **2 modules** d’atelier : Noyau blindé, Réseau neural.

Sans capacité, l’Assassin conserve son dash : **Espace** déclenche toujours quelque chose.

## Jouer en ligne

Le jeu est publié automatiquement sur GitHub Pages : **https://nono433.github.io/NexusBreach/**

Ouvre simplement cette adresse dans un navigateur sur PC. Aucune installation ni téléchargement n’est nécessaire.

## Lancer le jeu en local

Le plus simple : double-clique sur le raccourci **Nexus Breach** du Bureau, ou sur **`Lance Nexus Breach.bat`**.

Le lanceur démarre un serveur local et ouvre automatiquement le navigateur sur **http://localhost:5050**. Pour arrêter le serveur, ferme la fenêtre de lancement. Un serveur est indispensable : `game.js` est un module ES, et le protocole `file://` le bloque pour raisons de CORS.

Il te faut **Node.js** (https://nodejs.org) — le lanceur s'en sert pour servir `wwwroot` via `serveur.js`, sans aucune dépendance à installer. Si Node est absent mais que le SDK .NET 8 est présent, le lanceur bascule automatiquement sur `dotnet run`.

Pour démarrer le serveur sans ouvrir le navigateur :

```powershell
node serveur.js --no-browser
```

## Jouer sur mobile

Le jeu est jouable au doigt, sans application : ouvre l’adresse en ligne dans le navigateur du téléphone. **Il se joue en paysage** — un FPS en portrait n’a pas la place pour le joystick et la visée, et un écran bloque te l’indique.

Le mode tactile se détecte tout seul (pointeur grossier) : rien à cocher, et un ordinateur équipé d’un écran tactile n’affiche pas les commandes pour rien.

| Geste | Effet |
| --- | --- |
| **Glisser à gauche** (bas de l’écran) | Joystick flottant : il apparaît où tu poses le pouce. Il ne s’active que dans le coin gauche **et** le bas de l’écran, pour ne pas masquer le HUD. |
| **Glisser à droite** | Viser, **et tirer en même temps**. C’est le standard des FPS mobiles : sans tir automatique, il faudrait un troisième doigt. |
| **RECH / TIR / CAP** | Recharger, tir sans déplacer la vue, capacité. |
| **❚❚** (haut droite) | Pause. Indispensable : sur mobile il n’y a pas de pointer lock, donc aucune touche `Échap`. |

Quelques différences avec le PC, assumées :

- **Pas d’indication clavier** à l’écran, remplacées par les boutons.
- **La barre de vie est remontée en haut à gauche**, le compteur de munitions reste en bas à droite : le coin bas-gauche appartient au pouce.
- **Profil graphique allégé** : ombres et anticrénelage coupés, résolution réduite à 85 %, particules à 40 %, 50 images/seconde, et 8 ennemis simultanés au lieu de 11. Le jeu détecte aussi les machines faibles sur PC comme avant.
- **Son** : les navigateurs mobiles bloquent l’audio tant que tu n’as pas touché la page. Le premier appui le débloque.

Si tu veux tester les commandes tactiles depuis un ordinateur, ajoute `?tactile=1` à l’adresse.

## Tests

```powershell
node tests\headshot.test.mjs   # géométrie du headshot (15 cas)
node tests\balance.check.mjs   # vague de mort par configuration
node tests\encodage.cjs        # double encodage UTF-8
node tests\smoke.cjs           # jeu réel dans un navigateur headless (Ranger)
node tests\assassin.cjs        # classe Assassin : atelier, frappe, dash
node tests\tactile.cjs         # 13 étapes : joystick, visée, tir auto, pause, atelier
node tests\hud.cjs             # collisions du HUD en paysage (bureau)
node tests\hud.cjs --tactile   # idem en mode tactile
node tests\chevauchement.cjs   # cartes de l'Atelier de 1100 à 360 px
```

`balance.model.mjs` contient les mêmes constantes que `game.js` — si tu changes une courbe dans le jeu, change-la aussi dans le modèle, sinon les tests mentent.

`hud.cjs` compare les blocs du HUD en **encre visible** (le texte) ou en boîte peinte (les boutons), jamais en boîte de conteneur : un élément de grille est étiré sur toute sa cellule, donc deux frères voisins se toucheraient toujours alors que leurs libellés sont bien séparés. Un contrôle négatif est documented dans le fichier : remettre les boutons d’action en bas doit faire échouer le test.

## Commandes

Sur ordinateur :

- **ZQSD / WASD** — se déplacer
- **Souris** — viser
- **Clic gauche** — tirer (frapper aux sabres avec la classe Assassin)
- **Espace** — capacité active / dash Assassin
- **R** — recharger
- **Maj** — sprinter
- **Échap** — pause
- **M** — activer/désactiver le son

Sur mobile : voir [Jouer sur mobile](#jouer-sur-mobile).

## Améliorations

Après chaque vague, tu choisis un module parmi trois. Chaque classe a son propre jeu :

- **Ranger** : Canon amplifié, Gâche rapide, Chargeur étendu, Recharge accélérée, Rayons perforants, Nanites réparateurs, Optique de précision.
- **Assassin** : Lames affûtées, Tempête jumelle, Voile d’ombre, Sang d’Ombre, Sentence, Allonge, Garde d’ombre.
- **Communs** : Exosquelette, Propulseurs, Stabilisateurs.

Les modules permanents de l’Atelier deviennent plus chers à chaque niveau.

## Rééquilibrage

L’équilibrage n’est pas réglé à l’intuition : `tests/balance.model.mjs` rejoue le rapport de force vague par vague, et `tests/balance.check.mjs` vérifie que le résultat tient.

**Trois principes**

1. **Les améliorations de vague sont additives.** Avant, `+32 %` et `+24 %` s’appliquaient en cascade : `1,32⁶ × 1,24⁶ = ×32` de puissance après 12 choix. Le joueur montait trop vite, puis la fin devenait injouable. Aujourd’hui 6 niveaux de dégâts donnent **+78 %** et 6 niveaux de cadence **+66 %**. Toutes les statistiques sont recalculées depuis leurs valeurs de base par `applyUpgradeStats()`.
2. **Toutes les courbes ennemies sont plafonnées** (PV, dégâts, cadence, effectif, total par vague). Le joueur a un plafond de puissance fini ; une seule courbe non plafonnée garantit une mort arithmétique. La vague 50 demandait 304 ennemis, la vague 100 en demandait 804.
3. **L’Atelier permanent reste sobre**, parce que les crédits ne se gagnent qu’à la mort. Le modèle le vérifie explicitement.

**Résultat mesuré par le modèle**

| Situation | Vague de mort attendue |
|---|---|
| Première partie, arme de départ, aucun achat | 9 |
| Atelier financé (15 morts, 55 % d’investissement), arme de départ | 13 |
| Atelier financé, bonne arme | 28 à 36 |

L’Atelier apporte **+4 vagues** après 15 morts : utile, mais jamais suffisant. Le choix d’arme est ce qui compte le plus (13 → 36 avec le même investissement).

**Autres corrections**

- Le DPS affiché dans l’Atelier ne prenait en compte ni la perforation, ni l’explosion, ni la brasure : SCATTER-7 (450 CR) passait pour plus rentable que LANCE-01 (950 CR). Le calcul inclut maintenant ces facteurs, et les sabres affichent frappes/s et nombre de cibles.
- **NOVA PULSE** rapportait 7,5 DPS pour 500 CR, et **AEGIS SHIELD** devenait inutile dès que les Stabilisateurs dépassaient 65 % de réduction. Les deux sont reprises, et AEGIS ne peut plus dépasser le plafond global.
- **FOUNDRY** appliquait 1,22 de dégâts et 0,88 de cadence : le même équipement y mourait à la vague 12 là où il atteignait 42 sur Nexus. Assoupli à 1,12 et 0,94.
- Le score par élimination est borné, sinon il devient infini en fin de partie.

## Correctifs appliqués

**Bugs corrigés**

- **Headshots impossibles.** La hitbox cylindrique de chaque ennemi englobait la tête ; comme Three.js trie les intersections par distance, elle était toujours touchée avant le mesh de tête et le multiplicateur de headshot (jusqu'à ×2,5) ne s'appliquait jamais. Le test est désormais géométrique (rayon/sphère sur la tête), avec un centre légèrement relevé pour ne pas compter les tirs aux épaules.
- **Fuite de mémoire GPU.** `clearDynamicObjects` faisait `scene.remove()` sur les particules, tracers, anneaux et traînées sans `dispose()`. Chaque partie quittée laissait ses géométries et matériaux dans les buffers GPU.
- **Blocage à l'écran d'amélioration.** Quand tous les modules étaient au niveau maximum, les cartes proposées ne faisaient rien et l'écran ne se fermait plus. La vague suivante démarre directement, et un clic sur un module au maximum ne peut plus bloquer.
- **Pastilles de niveau décalées.** Le premier palier s'affichait actif avant tout achat.

**Performance**

- Géométrie de débris partagée et pool de matériaux : les impacts ne créent plus de géométries GPU à la volée (environ 108 créations par seconde avec une arme rapide).
- Suppression des allocations par frame dans `updateEnemies`, `getNavIndex` et `getFlowDirection` (quelques milliers de `Vector3` par seconde).
- `isBlocked` n'alloue plus de fermeture à chaque appel.
- Cible de raycast unique au lieu d'une fusion de tableaux recopiée à chaque projectile.
- La shadow map n'est plus re-rendue à chaque frame.
- Les écritures DOM par frame (recharge, compteur d'ennemis, flash de dégâts) passent par le cache du HUD.

**Ressenti**

- Recul caméra multiplié par 2,5 (0,79° → ~1,8° pour le RAIL), chaque arme a désormais son propre tremblement.
- Un tir qui touche un ennemi produit une gerbe d'impact, dorée sur un headshot.

