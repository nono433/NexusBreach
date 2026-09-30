# Nexus Breach — version brightness

Jeu de tir en vue à la première personne avec vagues de monstres et amélioration d'équipement après chaque vague.

## Progression et équipement

- Quand le joueur meurt, il reçoit des crédits calculés selon la vague, les éliminations, le score, la précision, les headshots, le temps de survie et l’efficacité.
- Les crédits et l’équipement sont sauvegardés dans le navigateur via `localStorage`.
- Le menu **ARCHIVE DE PROGRESSION** permet de télécharger un fichier de sauvegarde JSON et de le restaurer sur le même ordinateur ou sur un autre. La sauvegarde contient les crédits, les armes, les capacités, les modules, le meilleur score et la carte sélectionnée.
- Le bouton **ATELIER // ÉQUIPEMENT** du menu, ou **VISITER L'ATELIER** après une mort, permet d’acheter des bonus permanents.
- Les modules achetés sont automatiquement actifs au début de la prochaine partie. Les améliorations affichées entre les vagues restent temporaires à la partie en cours.
- Deux cartes sont disponibles : **NEXUS** et **FOUNDRY**. La carte sélectionnée est sauvegardée dans le navigateur. Nexus conserve ses quatre mobs standards, tandis que Foundry possède quatre machines personnalisées et plus fortes : **Crawleur de Scorie**, **Rôdeur de Braise**, **Colosse de Laitier** et **Forge-Monarque**.
- Deux modes de jeu sont disponibles : **CAMPAGNE** et **DONJON**. Voir la section « Le mode Donjon » plus bas. Le mode sélectionné est sauvegardé dans le navigateur.

## Le mode Donjon

Le Donjon n'est pas une carte de plus : c'est une autre façon de terminer une vague et de progresser. On y descend de salle en salle, et rien de ce qui fait la campagne n'y existe.

**Ce qui change**

- **Les salles sont tirées au sort.** Chaque palier tire ses obstacles, ses piliers, ses pastilles d'apparition et ses lumières à partir d'une graine. Deux parties ne se ressemblent pas.
- **On n'a pas d'écran de fin de vague.** Pas de modules, pas de carte de soin. Quand la salle est vide, le portail s'ouvre et c'est tout.
- **On franchit une porte pour descendre.** Le portail apparaît quelque part dans la salle, et il faut le traverser : on ne passe pas à la salle suivante automatiquement.
- **Les crédits se gagnent par élimination et se dépensent au terminal.** Un terminal d'atelier traîne dans environ 40 % des salles, à distance du portail. On peut l'ignorer et descendre, ou perdre du temps et des munitions à le chercher.
- **Le terminal ne vend ni classe, ni capacité, ni module d'atelier.** À la place, huit **améliorations de statistiques** : dégâts, cadence, intégrité, recharge, chargeur, vitesse, blindage, perforation. Elles ont plusieurs niveaux, le coût monte de 50 à 90 % à chaque niveau, et elles ne valent que pour la descente en cours. Sans elles, la seule chose à faire de son argent serait changer d'arme.
- **L'Atelier permanent est coupé.** Le Donjon renvoie des multiplicateurs à zéro : un joueur qui a joué cent fois en campagne arrive au premier palier sans aucun bonus.
- **Aucun soin gratuit.** Pas de module, pas de capacité : la vie ne se refait qu'en payant.
- **Un boss tous les cinq paliers.** L'Alpha n'est pas tiré au sort comme en campagne, il est une échéance.

**Ce qui ne change pas** : les deux classes, les armes, les capacités, les cartes, et tout ce qui se débloque en campagne. Le Donjon s'y joue avec ce qu'on a déjà, et n'y rend rien.

**Deux portefeuilles, jamais confondus.** L'argent du Donjon est de l'argent de run : il ne touche pas au crédit d'atelier. **Il se garde d'un palier à l'autre et ne disparaît qu'à la mort.** C'est ce qui donne un intérêt à nettoyer vite et à descendre, et ce qui permet d'arriver chez un marchand avec de quoi acheter — un terminal trouvé dans une salle vide ne sert à rien. Le HUD annonce ce qu'on peut dépenser maintenant, le menu continue d'annoncer ce qu'on possède entre les parties.

**Une nouvelle partie repart de zéro**, argent comme améliorations. Le run est la bonne unité : ce qu'on a dépensé appartient à cette descente, pas au personnage qu'on remplace.

**Les ennemis ne se bloquent plus dans les murs.** C'était le défaut le plus signalé du mode, et il avait trois causes distinctes, toutes corrigées :

1. Le générateur garantissait la connectivité des salles avec une grille de 1,0 unité, alors que le jeu navigue sur une grille de 1,5 avec une règle de coupe de coin. Une salle pouvait donc être validée par le générateur et contenir des zones où l'IA ne savait pas revenir. Le générateur rejoue maintenant **exactement** les règles de navigation du jeu, et `navConcordance()` vérifie que les deux modèles n'ont pas divergé.
2. Le point d'apparition des ennemis était décalé aléatoirement de ±0,75 unité **sans être vérifié** : un ennemi pouvait naître à l'intérieur d'un bloc.
3. Le champ de navigation n'était reconstruit qu'à la frame suivante. `findSpawnPosition` le consulte pour choisir où naître, et lisait donc un décor qui n'existait plus. Il est maintenant reconstruit immédiatement.

S'y ajoute un **filet de sécurité** : un ennemi qui n'a pas bougé pendant 1,1 s, à plus de 3,2 m du joueur, est replacé sur la case de navigation qui fait le plus de progrès vers lui. Il couvre le cas résiduel, qu'aucune grille ne peut traiter : un couloir trop étroit au milieu alors que ses deux extrémités sont libres.

## Les graphismes

Le jeu garde sa lecture *low-poly*, mais il ne lit plus « une pile de cubes ». Deux changements, choisis parce qu'ils sont bon marché et durable.

**Des arêtes coupées.** Le cube de base de tous les robots est devenu une boîte chanfreinée : 44 triangles au lieu de 12, avec une facette qui attrape la lumière sur chaque arête. C'est le levier le plus large du projet : les 27 pièces d'un robot sont décrites par `box()` et fusionnées par `mergeBoxParts`, qui lit ce cube. **Le chanfrein s'applique donc partout d'un coup, sans toucher aux 161 lignes du constructeur**, et toujours en une seule géométrie fusionnée.

Le même traitement est appliqué à l'arme du joueur, aux sabres de l'Assassin, à la tête des robots, aux murs de l'arène et aux blocs de couverture. **Les liserés lumineux ne sont pas chanfreinés** : ils font sept millimètres d'épaisseur, un chanfrein ne ferait que les ternir. **La hitbox des ennemis non plus** — elle est invisible, mais elle sert aussi de cible de visée, et une boîte chanfreinée a les coins rentrés : un ennemi tiré à l'épaule cesserait d'être touché. Un changement graphique qui modifie le tir, on ne le fait pas.

**Une plaque de blindage.** Une seule image, construite au premier besoin, partagée par tous les ennemis, les murs et les couvertures : joints de panneaux, rivets, salissure. Elle est volontairement claire et peu contrastée, parce qu'une carte se multiplie avec la couleur du matériau — trop sombre, tous les ennemis deviendraient la même tache noire. Elle est sans doute le changement le plus visible : sans elle, chaque surface est un aplat, et le seul relief vient de la silhouette.

Les coordonnées de texture sont mises à l'échelle de la pièce, sinon un avant-bras de vingt centimètres et un buste de deux mètres porteraient le même nombre de joints. Elles sont choisies par projection sur la face, pas en prenant x et y par réflexe : sinon le dessus d'un bloc reçoit des coordonnées qui varient peu, et la texture s'étire en bavures laites.

**Des cartes de normales.** C'est le changement qui manque le plus, et il ne coûte rien : une seule image de plus, partagée par tous les matériaux.

La carte de couleur ne change que la **teinte** d'une surface ; elle ne change pas la façon dont cette surface répond à une lumière qui bouge. Un joint de panneau peint est une ligne plus sombre ; un joint de panneau **en relief** est une creuse qui renvoie la lumière d'un côté et l'ombre de l'autre. C'est la différence entre un décor imprimé et un décor physique.

La technique : on dessine d'abord un relief en niveaux de gris — blanc en haut, noir en creux — puis on le convertit en normale par un filtre de Sobel. Le blindage a ses joints et ses rivets en bosses ; le sol a ses dalles creuses, avec deux joints sur cinq pour qu'il ne devienne pas un quadrille parfait. Les deux textures sont **partagées** : le test `graphismes.cjs` crée vingt ennemis et vérifie que le nombre d'images en mémoire ne bouge pas, parce qu'une texture regénérée par ennemi mourrait à chaque apparition et ferait saccader le jeu au bout de quelques minutes, sans qu'aucune erreur ne soit levée.

**Le sol.** Il occupe le tiers bas de l'écran en permanence, et c'était le dernier grand aplat du jeu. Rugosité plus haute, métal plus bas : le sol accroche moins la lumière au loin et renvoie davantage de détail quand on le regarde.

**L'atmosphère.** Brouillard un peu plus dense, pour que le fond se retire. Ombres passées de 1024 à **2048** sur ordinateur : c'est le levier le plus gratuit qui reste pour la profondeur, parce qu'une ombre nette donne une indication de distance et de hauteur qu'aucune couleur ne remplace. Coût nul en temps de calcul, la carte d'ombres étant rendue une fois, pas par image.

### Ce que je ne peux pas faire ici

Le projet ne contient qu'un module Three.js, `three.module.min.js`. **Il n'y a pas de post-traitement** : ni bloom, ni profondeur de champ, ni aberration chromatique. Les ajouter demanderait d'embarquer d'autres fichiers, ce qui est une décision de taille, pas une optimisation. C'est le principal levier restant, et il n'est pas dans le budget actuel.

### Ce que ça coûte, et ce que je ne peux pas mesurer

Un robot passe d'environ 350 à **1 588 triangles**. Douze ennemis à l'écran, c'est 19 000 triangles pour toute la scène. C'est modeste pour n'importe quel GPU.

**Je ne peux pas mesurer ton framerate sur téléphone.** Le test `perf-chanfrein.cjs` compte les triangles, chiffre réel, et il refuse volontairement d'affirmer quoi que ce soit sur la fluidité : le navigateur de test bride `requestAnimationFrame` en mode headless, et un seuil posé sur cette mesure serait un mensonge qui décourage sans rien dire du jeu sur un mobile.

## Les deux classes

Les classes ne sont plus deux variantes du même jeu : **armes, capacités, améliorations et modules d’atelier sont exclusifs à chaque classe.** L’atelier n’affiche que ce qui est réellement accessible.

### RANGER — tir à distance, contrôle de zone

- **100 PV**, vitesse 6,1. Plus résistant, mais dépend de la portée.
- **8 armes à feu** : AR-9 PULSE (départ), SCATTER-7, NOVA-12, VECTOR-6, FROST-3, LANCE-01, PYRO-4, ARC-9 PLASMA.
- **4 capacités** : NOVA PULSE (dégâts de zone), CRYO FIELD (ralentit 70 %), AEGIS SHIELD (−45 % de dégâts), OVERLOAD CORE (+50 % de dégâts, +60 % de cadence). **Aucune ne soigne.**
- **6 améliorations** exclusives : Canon amplifié, Gâche rapide, Chargeur étendu, Recharge accélérée, Rayons perforants, Optique de précision. Les Nanites réparateurs ont été retirés : le Ranger ne peut plus se soigner.
- **3 modules** d’atelier : Bobine pulsante, Déclencheur surcadencé, Chargeur tactique.
- **Fin de vague : un choix, pas trois modules.** Soit il se régénère entièrement, soit il prend une amélioration. Les deux options s’excluent, et il n’y a plus aucun soin ailleurs.

La vie du Ranger ne remonte donc jamais pendant une partie, sauf par ce choix. C’est un arbitrage : l’une rend les points de vie sans rien faire progresser, l’autre augmente la puissance sans rien rendre. L’option de soin disparaît d’ailleurs de l’écran quand la vie est déjà au maximum, pour ne pas laisser une carte morte à la place d’un module.

L’Assassin n’est pas concerné : il garde ses trois cartes direct, et sa SANG-DÉCHIRÉ qui soigne sur élimination.

### ASSASSIN — corps à corps, mobilité, exécution

- **84 PV**, vitesse 7,3. Plus rapide et plus fragile : il doit entrer dans la mêlée.
- **5 armes** : LAMES JUMELLES (départ, 2 cibles), LAME SPATULE (1 cible, 108 dégâts), CROCS JUMELS (3 cibles, rapide), SHURIKEN VOLANT (lancer à distance, 9 coups/s), PAS D’OMBRE (la frappe voyage avec le dash).
- **4 capacités** : PAS OMBRE (reset le dash, +50 % de dégâts), VOILE SOMBRE (invisible 1,5 s, la frappe suivante est un headshot garanti), SANG-DÉCHIRÉ (+45 % de dégâts, 6 PV par élimination), HEURE DE CENDRE (ralentit 55 %, 90 dégâts au plus résistant).
- **7 améliorations** exclusives : Lames affûtées, Tempête jumelle, Voile d’ombre, Sang d’Ombre, Sentence, Allonge, Garde d’ombre.
- **3 modules** d’atelier : Fil des lames, Tendon synthétiques, Pacte de sang.

### Partagés par les deux classes

- **3 améliorations** : Exosquelette, Propulseurs, Stabilisateurs.
- **2 modules** d’atelier : Noyau blindé, Réseau neural.

L’Assassin garde son dash même sans capacité achetée : il est sur **F**, et le bouton **DASH** apparaît dès que la classe est active, capacité ou non.

## Jouer en ligne

Le jeu est publié automatiquement sur GitHub Pages : **https://nono433.github.io/NexusBreach/**

Ouvre simplement cette adresse dans un navigateur sur PC. Aucune installation ni téléchargement n’est nécessaire.

## Lancer le jeu en local

Le plus simple : double-clique sur **`Lance Nexus Breach.bat`**, dans le dossier du projet. Le lanceur démarre un serveur local et ouvre le navigateur sur **http://localhost:5050**. Pour arrêter le serveur, ferme la fenêtre de lancement. Un serveur est indispensable : `game.js` est un module ES, et le protocole `file://` le bloque pour raisons de CORS.

### Deux versions du jeu sur cette machine

Il existe une copie de sauvegarde du projet dans `NexusBreach-depot-8917d1a`. Elle a été conservée volontairement : elle contient une version antérieure, avec une classe Tank.

**Les deux copies utilisent le port 5050, et leurs lanceurs étaient identiques.** Rien ne distinguait donc la version qu'on jouait, et c'est la source d'une confusion répétée : on lançait le mauvais dossier, et on croyait que le mode Donjon n'existait pas.

Deux garde-fous règlent le problème :

- **Le lanceur refuse de démarrer si le port est déjà occupé par l'autre copie.** Il va chercher le sélecteur de mode dans la page servie ; s'il est absent, il s'arrête et nomme le dossier fautif. Vérifié dans les deux sens : dépôt en place → refus, rien en place → démarrage normal, bon jeu en place → ouverture.
- **L'onglet du navigateur porte le mode** : `Nexus Breach // DONJON` ou `Nexus Breach // CAMPAGNE`. Si tu cliques sur DONJON et que le titre ne change pas, tu es dans la mauvaise copie.

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
| **Glisser à droite** | Viser, et rien d'autre. Le tir ne part que du bouton TIR : viser et tirer étaient fondus dans le même geste, donc toute correction de visée partait en rafale. |
| **RECH / TIR / CAP / DASH** | Recharger, tir sans déplacer la vue, capacité, dash. Le bouton DASH n'apparaît que chez l'Assassin. |
| **❚❚** (haut droite) | Pause. Indispensable : sur mobile il n’y a pas de pointer lock, donc aucune touche `Échap`. |

Le tir automatique pendant le glissement a été **retiré**. Viser et tirer étaient fondus dans le même geste : le joueur ne pouvait plus corriger sa visée sans déclencher une rafale, et les munitions s'écoulaient pendant qu'il cherchait où poser son doigt. Le bouton TIR est désormais le seul geste qui tire.

Quelques différences avec le PC, assumées :

- **Pas d’indication clavier** à l’écran, remplacées par les boutons.
- **La barre de vie est remontée en haut à gauche**, le compteur de munitions reste en bas à droite : le coin bas-gauche appartient au pouce.
- **Profil graphique allégé** : ombres et anticrénelage coupés, résolution réduite à 85 %, particules à 40 %, 50 images/seconde, et 8 ennemis simultanés au lieu de 11. Le jeu détecte aussi les machines faibles sur PC comme avant.
- **Son** : les navigateurs mobiles bloquent l’audio tant que tu n’as pas touché la page. Le premier appui le débloque.

Si tu veux tester les commandes tactiles depuis un ordinateur, ajoute `?tactile=1` à l’adresse.

### L'Assassin : deux ressources, deux touches

L'Assassin a un **dash** et une **capacité de classe**, et ils ont chacun leur bouton. **Espace** ou le bouton **CAP** pour la capacité, **F** ou le bouton **DASH** pour le dash. Le bouton DASH n'existe que chez l'Assassin : le Ranger n'a pas de dash, et n'hériterait pas d'un bouton qui ne répond à rien.

Une touche qui fait deux choses n'en fait aucune correctement. C'était le cas : une seule touche pour deux ressources, et la capacité la prenait dès qu'elle était achetée. Pendant sa recharge, l'appui ne faisait **rien**, et le dash devenait injoignable pendant 12 à 26 secondes d'affilée. Le pire exemple est écrit dans sa propre description — **PAS OMBRE** promet « reset immédiat du dash et +50 % de dégâts pendant 6 secondes » : il remettait le compteur à zéro, puis bloquait la touche qui sert à s'en servir.

Le HUD cachait le problème : il n'affichait l'état du dash que lorsqu'aucune capacité n'était équipée, et l'indicateur « prêt » ne regardait que la capacité.

`tests\dash-assassin.cjs` conduit une vraie partie — il débloque la classe et la capacité **par la boutique**, parce que la possession vit dans la sauvegarde et ne peut pas être forcée par le stockage — puis presse les deux touches par de vrais événements clavier. Son contrôle négatif est la séparation elle-même : si une touche déclenchait l'autre ressource, le test échouerait.

| | ESPACE | F |
|---|---|---|
| capacité déclenchée | 2 sur 5 | **0 sur 5** |
| dash déclenché | **0 sur 5** | 4 sur 5 |

Le zéro dans chaque case est le contrôle : c'est lui qui distingue « les deux touches marchent » de « une touche fait les deux ».

Ce sont des **robots humanoïdes cubiques** : corps sombre, contours lumineux, visière cyan. Tout est construit en code, à partir de boîtes, sans aucun fichier 3D externe.

- Chaque type garde sa couleur d'origine (vert, jaune, rouge, rose) : c'est un signal de lecture, le joueur repère une menace en un coup d'œil.
- La silhouette se distingue par la masse du buste, pas par le nombre de pattes. Un robot humanoïde a deux jambes, quel que soit le type.
- Les parties immobiles sont fusionnées en une géométrie par matériau. Sans cela, chaque robot coûterait une vingtaine d'appels de dessin, et il peut y avoir onze ennemis à l'écran.
- **Les bras s'animent** : ils se lèvent quand l'ennemi arme une attaque. Le tir à distance s'appuiera sur le même geste.
- La hitbox est une boîte alignée sur le buste, et non un cylindre qui englobait la tête. C'est la cause du bug de headshot corrigé plus haut.

#### Deux rôles, et un seul

Un type sur deux sait tirer. Ce n'est pas une question de réglage, c'est la décision qui rend le jeu lisible.

Faire tirer tous les ennemis paraissait avancé : chacun avait une réponse à distance. En jeu, cela supprimait le rôle de proximité. Foncer sur un ennemi devenait un automatisme, et il ne restait plus rien à décider. La moitié de la population est donc **Chargeuse** : elle avance, et ne sait rien faire d'autre. L'autre moitié est **Tireuse** : elle se stabilise au loin et couvre le groupe.

| Rôle | Types | Ce que ça impose |
| --- | --- | --- |
| Chargeur | Rôdeur, Brute, et leurs équivalents Fonderie | Les abattre avant qu'ils arrivent, ou tenir la distance |
| Tireur | Chasseur, Alpha | Les approcher pour les faire taire, ou chercher un couvert |

La règle à maintenir est une seule : **un type qui déclare `portee` sait tirer**. C'est tout ce que `avecTir` et l'IA ont besoin de savoir.

Un projectile vaut `degats` fois les dégâts au contact de l'ennemi : Chasseur et Braise 0,45, Alpha 0,80, Forge-Monarque 0,85. Et `cadence` est un **multiplicateur d'intervalle**, pas un nombre de coups par seconde : le délai réel vaut `attackCooldown(vague) × cadence`, donc **tirer plus vite, c'est baisser la valeur**. Les Chasseurs sont à 1,15 et les Alpha à 1,75.

`tests\tir-distance.cjs` mesure 3,64 dégâts par projectile de Chasseur à la vague 7, ce que le modèle annonce exactement.

#### Le rechargement du Ranger

Les huit armes du Ranger ont un rechargement allongé de 20 %. Ce n'est pas une valeur décorative : `balance.check.mjs` affiche le **débit réellement soutenu**, recharge comprise, parce que `dégâts × cadence` se trompe de 25 à 50 %.

| Arme | Brut | Soutenu | Temps d'occupation |
| --- | --- | --- | --- |
| PULSE | 151 | 115 | 76 % |
| SCATTER | 32 | 22 | 67 % |
| NOVA (SMG) | 208 | 139 | 67 % |
| VECTOR | 181 | 114 | 63 % |
| FROST | 108 | 74 | 68 % |
| RAIL | 132 | 87 | 66 % |
| PYRO | 108 | 68 | 63 % |
| PLASMA | 212 | 152 | 72 % |

Le VECTOR ne tire que 63 % du temps : six balles, puis 1,9 s d'attente. C'est lui qui encaisse le plus (−6,2 % de débit soutenu), et c'est le moins cher en temps réel.

Le modèle de survie, lui, reste calibré sur `raw` et ne voit donc pas ce changement : les integrationurs de `raw` ont été réglés dessus, et les corriger d'un coup décalerait toutes les vagues de mort. C'est un sujet à part, et il n'est pas réglé.

Un projectile est visible par construction : cœur plus gros, enveloppe additive, et une traînée qui s'étire dans l'axe du tir. Il est arrêté par les obstacles à chaque image — le décor protège vraiment. Sa taille à l'écran n'est pas une impression : `tests\capture-projectile.cjs` la mesure et refuse de valider une capture sans projectile visible.

Pour voir les robots isolément, sans lancer une partie :

```powershell
node tests\generer-apercu-robots.cjs   # regenere tests\apercu-robots.html
node tests\capture-robots.cjs          # tests\preview-robots.png
```

L'aperçu n'est **pas recopié à la main** : `generer-apercu-robots.cjs` extrait le code du robot de `game.js`, et lit les couleurs et les échelles dans les gabarits. Une recopie dérive un jour, et l'aperçu ment alors qu'on le croyait fidèle. Il a été seizure une fois par le nettoyage d'avant push — il vivait dans `wwwroot` — et le test de cohérence échouait alors sur un fichier absent, sans rien dire du robot. Il est donc dans `tests\`, hors du site.

`coherence-robots.cjs` reste nécessaire malgré la génération : le générateur pourrait extraire un bloc trop court, ouublier une constante, et l'aperçu montrerait alors un autre robot sans que rien ne le signale. Il vérifie onze constantes de proportion, les cinq couleurs et échelles, et la couleur de la visière.

## Tests

```powershell
node tests\headshot.test.mjs   # géométrie du headshot (15 cas)
node tests\balance.check.mjs   # vague de mort par configuration
node tests\alpha.mjs              # les Alpha, avant / apres correction
node tests\zone-morte.cjs          # constante lue avant sa declaration
node tests\coherence-robots.cjs    # l'apercu des robots ressemble au jeu
node tests\sauvegarde-ancienne.cjs # sauvegarde d'avant le split des classes
node tests\garde-demarrage.cjs     # un echec au demarrage est signale
node tests\encodage.cjs            # double encodage UTF-8
node tests\smoke.cjs           # jeu réel dans un navigateur headless (Ranger)
node tests\assassin.cjs        # classe Assassin : atelier, frappe, dash
node tests\tactile.cjs         # 14 étapes : joystick, visée, séparation du tir, pause, atelier
node tests\hud.cjs             # collisions du HUD en paysage (bureau)
node tests\hud.cjs --tactile   # idem en mode tactile
node tests\chevauchement.cjs   # cartes de l'Atelier de 1100 à 360 px
node tests\roles-ennemis.cjs     # 4 Chargeurs, 4 Tireurs, et l'IA respecte le rôle
node tests\salle-donjon.cjs      # 120 salles générées : praticables, reproductibles, variées
node tests\donjon.cjs            # le Donjon : porte, descente, démolition, terminal, deux poches
node tests\capture-donjon.cjs    # photographies du menu, d'une salle et de la porte
node tests\equilibrage-tir.mjs   # ce que le tir coûte, en temps de survie
node tests\tir-distance.cjs      # ce qu'un projectile inflige, mesuré dans le jeu
node tests\dash-assassin.cjs     # la capacité s'ajoute au dash, elle ne le remplace pas
node tests\soin-ranger.cjs       # le Ranger n'a plus de soin, et son choix est réel
node tests\pilote-cdp.cjs        # le pilote de navigateur est-il fiable ?
node tests\capture-projectile.cjs # un projectile en vol, et sa taille en pixels
node tests\capture-robots.cjs    # l'aperçu des robots est bien rendu
```

`tactile.cjs` sortait **toujours en 0**, y compris après une étape en échec : il rapportait, il ne vérifait pas. Il tombe maintenant sur une étape ratée, une erreur JavaScript, ou un rapport absent. Son étape `glisse-ne-tire-pas` attend douze images de glissement continu avant de conclure, parce qu'une étape qui doit observer un *non* verrait sinon sa condition vraie avant que l'action ait eu le moindre effet.

Contrôle négatif vérifié : le tir automatique remis en place, l'étape échoue et le test sort en 1.

`balance.model.mjs` contient les mêmes constantes que `game.js` — si tu changes une courbe dans le jeu, change-la aussi dans le modèle, sinon les tests mentent.

### Les captures, et pourquoi elles étaient impossibles

`_cdp.cjs` pilote le navigateur par le **protocole DevTools**. Ce n'était pas un détail technique : toutes les captures passaient par `--virtual-time-budget`, et ce drapeau est un piège. Le temps virtuel accélère les minuteries, mais `requestAnimationFrame` reste piloté par le compositeur, qui ne donne presque rien. Mesuré :

| Réglage | Images rAF en 12 s de temps virtuel |
| --- | --- |
| `--virtual-time-budget` seul | 1 |
| + `--run-all-compositor-stages-before-draw` | 2 |
| sans budget (la capture part au chargement) | 0 |

Le jeu ne peut pas jouer dans ces conditions : **aucune capture de jeu n'était possible**, et c'est pour ça que le rendu d'un projectile n'avait jamais été observé. Par le protocole DevTools, le navigateur tourne en temps réel — 38 images par seconde mesurées — et c'est le test qui décide quand lire la page et quand photographier.

`capture-projectile.cjs` a un **contrôle négatif** : `--stub` remplace la sonde par une fonction qui ne voit jamais rien, et le test doit alors échouer. La version précédente ne pouvait pas échouer : elle photographiait un numéro d'image fixe sans savoir si un projectile existait, et produisait donc des images vides en ayant le droit de passer.

`tir-distance.cjs` mesure ce qu'un projectile **inflige réellement**, et pas ce qu'on suppose. C'est nécessaire parce que la vie baisse aussi au contact : sans distinguer les deux origines, un test qui voit la barre diminuer croit mesurer le tir alors qu'il mesure n'importe quoi. Le jeu tient donc un journal des coups encaisses.

Il a **deux contrôles négatifs**, parce qu'ils ne vérifient pas la même chose :

| Option | Ce qu'elle falsifie | Ce que le test doit faire |
| --- | --- | --- |
| `--stub` | la sonde d'observation | échouer sur « aucun projectile vu en vol » |
| `--attendu=9` | la valeur attendue | échouer sur la comparaison des dégâts |

Les diagnostics dont ces deux tests ont besoin sont sur `window.__nexus`, qui est le point d'entrée de diagnostic du jeu :

- `sonderProjectiles()` — ce que voit le joueur d'un projectile : distance, taille **en pixels**, position à l'écran. C'est ce chiffre qui a répondu à la plainte, et la réponse était 3 pixels.
- `derniersDegats()` — les derniers coups encaissés, avec leur **origine** (`tir` ou `contact`) et un numéro d'ordre. Le numéro est indispensable : le journal est circulaire, donc sans lui un test qui le relit compte le même coup plusieurs fois.
- `allerVague(n)` — sauter à une vague. Sans lui, la capture est impossible : un joueur immobile ne termine pas la vague 1, or la vague 1 ne contient que des Rôdeurs, et un Rôdeur ne tire pas.
- `etatAction()` — l'état de la touche d'action de l'Assassin : les deux recharges et ce qui est prêt. Le HUD n'en montrait qu'une, il fallait donc pouvoir lire les deux.
- `etatSoin()` et `terminerVague()` — l'état des soins et la fin de vague forcée, pour vérifier le nouveau choix du Ranger sans jouer vingt minutes. `blesserJoueur(fraction)` l'y met : sans blessure, se régénérer et ne rien faire seraient indiscernables.

`hud.cjs` compare les blocs du HUD en **encre visible** (le texte) ou en boîte peinte (les boutons), jamais en boîte de conteneur : un élément de grille est étiré sur toute sa cellule, donc deux frères voisins se toucheraient toujours alors que leurs libellés sont bien séparés. Un contrôle négatif est documented dans le fichier : remettre les boutons d’action en bas doit faire échouer le test.

## Commandes

Sur ordinateur :

- **ZQSD / WASD** — se déplacer
- **Souris** — viser
- **Clic gauche** — tirer (frapper aux sabres avec la classe Assassin)
- **Espace** - capacité active (toutes classes)
- **F** - dash Assassin (aucun effet pour le Ranger)
- **R** — recharger
- **Maj** — sprinter
- **Échap** — pause
- **M** — activer/désactiver le son

Sur mobile : voir [Jouer sur mobile](#jouer-sur-mobile).

**Dans le Donjon, il n’y a pas de touche de plus.** Le portail et le terminal sont franchissables : on descend et on achète en marchant dessus. C’est volontaire — dans un jeu où on n’a qu’une arme, faire viser une porte serait absurde.

## Améliorations

**En campagne**, après chaque vague, tu choisis un module parmi trois. Chaque classe a son propre jeu :

- **Ranger** : Canon amplifié, Gâche rapide, Chargeur étendu, Recharge accélérée, Rayons perforants, Optique de précision. Le Ranger n'a **aucun module de soin** : les Nénithes réparateurs ont été retirés. Ses seules sources de vie sont celles du mode Donjon, à savoir aucune.
- **Assassin** : Lames affûtées, Tempête jumelle, Voile d’ombre, Sang d’Ombre, Sentence, Allonge, Garde d’ombre.
- **Communs** : Exosquelette, Propulseurs, Stabilisateurs.

Les modules permanents de l’Atelier deviennent plus chers à chaque niveau.

**Dans le Donjon, il n’y a pas d’écran d’amélioration.** C’est volontaire : la progression passe uniquement par les crédits gagnés aux éliminations et dépensés au terminal trouvé dans la salle. Le joueur peut donc arriver au palier 3 sans avoir pris un seul module.

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

