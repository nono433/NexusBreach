# Nexus Breach — version brightness

Jeu de tir en vue à la première personne avec vagues de monstres et amélioration d'équipement après chaque vague.

## Progression et équipement

- Quand le joueur meurt, il reçoit des crédits calculés selon la vague, les éliminations, le score, la précision, les headshots, le temps de survie et l’efficacité.
- Les crédits et l’équipement sont sauvegardés dans le navigateur via `localStorage`.
- Le bouton **ATELIER // ÉQUIPEMENT** du menu, ou **VISITER L'ATELIER** après une mort, permet d’acheter des bonus permanents.
- Les modules achetés sont automatiquement actifs au début de la prochaine partie. Les améliorations affichées entre les vagues restent temporaires à la partie en cours.
- L’arsenal contient **AR-9 PULSE**, **SCATTER-7**, **NOVA-12**, **LANCE-01**, **VECTOR-6**, **PYRO-4**, **FROST-3** et **ARC-9 PLASMA**. Chaque fiche indique les dégâts, la cadence, la précision, la portée, le chargeur, la recharge, le bonus headshot et l’effet spécial. L’arme sélectionnée dans l’atelier est utilisée au prochain lancement.
- Les capacités **NOVA PULSE**, **CRYO FIELD**, **AEGIS SHIELD** et **OVERLOAD CORE** s’achètent dans l’atelier. Une capacité peut être équipée et s’active avec le **clic droit** pendant la partie.
- Deux cartes sont disponibles : **NEXUS** et **FOUNDRY**. La carte sélectionnée est sauvegardée dans le navigateur. Nexus conserve ses quatre mobs standards, tandis que Foundry possède quatre machines personnalisées et plus fortes : **Crawleur de Scorie**, **Rôdeur de Braise**, **Colosse de Laitier** et **Forge-Monarque**. Les variantes de Foundry sont plus rapides, infligent davantage de dégâts, frappent plus souvent et rapportent plus de points.

## Jouer en ligne

Le jeu est publié automatiquement sur GitHub Pages : **https://nono433.github.io/NexusBreach/**

Ouvre simplement cette adresse dans un navigateur sur PC. Aucune installation ni téléchargement n’est nécessaire.

## Lancer le jeu en local

Le plus simple : double-clique sur le raccourci **Lance Nexus Breach** créé sur le Bureau, ou sur **`LanceNexusBreach.bat`**.

Le lanceur démarre le serveur local et ouvre automatiquement le navigateur sur **http://localhost:5050**. Pour arrêter le serveur, ferme la fenêtre de lancement.

Pour lancer depuis un terminal :

```powershell
dotnet run --configuration Release
```

Pour démarrer le serveur sans ouvrir le navigateur :

```powershell
dotnet run --configuration Release -- --no-browser
```

## Commandes

- **ZQSD / WASD** — se déplacer
- **Souris** — viser
- **Clic gauche** — tirer
- **Clic droit** — capacité active
- **R** — recharger
- **Maj** — sprinter
- **Échap** — pause
- **M** — activer/désactiver le son

## Améliorations

Après chaque vague, choisis un module : puissance, cadence, capacité du chargeur, recharge, armure, mobilité, régénération, perforations ou réduction des dégâts.

La carte de cette version est légèrement plus lumineuse que celle de l'ancienne version.
