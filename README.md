# Jade Dominion Arena — Three.js Action RPG

**Production URL:** _pending Vercel deployment_

Jade Dominion Arena is a copyright-safe browser action-RPG inspired by the broad feel of classic Conquer Online 2.0-style systems: isometric click/WASD movement, class choice, fast target combat, skills, potions, loot, shops, Meteor-style +N equipment enhancement, a minimap, quest progression, and a gate boss.

This project does **not** copy Conquer Online assets, names, maps, UI, proprietary data, or branding. The characters, arena, UI, mechanics implementation, procedural geometry, materials, and naming are original for this Three.js feature slice.

## Live demo

The Vercel production link will be written here after deployment.

## Features

- **Four class archetypes:** Warrior, Trojan, Archer, and Taoist.
- **Distinct class identity:** different stats, weapons, attack types, visuals, starter gear, and skill loadouts.
- **Character creation:** name entry and class selection before entering the arena.
- **Three.js arena:** original isometric/top-down scene with paths, buildings, lanterns, props, walls, fog, lights, shadows, labels, and smooth camera follow.
- **Combat:** basic attacks, crits, armor mitigation, MP regen, shield/ward effects, ranged projectiles, dash/line skills, AoE skills, XP/Chi-style ultimate, floating damage text, and combat log.
- **Progression:** XP, level-ups, HP/MP/stat growth, gold, quest objectives, boss gate, and victory/defeat flow.
- **Economy:** HP/MP potions, merchant shop, buy/sell flow, loot drops, rarity colors, and randomized item stats.
- **Equipment enhancement:** Meteor stones upgrade equipped items to +N with visible stat growth.
- **Navigation:** minimap with player, enemies, loot, obstacles, and coordinate/enemy-count caption.
- **Input:** keyboard, click-to-move, enemy clicking/targeting, and mobile/coarse-pointer joystick.
- **Debug API:** `window.__jadeDominionDebug` for deterministic browser verification.

## Controls

| Action | Controls |
| --- | --- |
| Move | WASD / Arrow keys / click ground / mobile joystick |
| Run | Hold Shift |
| Target | Click an enemy |
| Basic attack | Space, or stay in range of selected target |
| Skills | 1, 2, 3, 4 |
| HP potion | H |
| MP potion | J |
| Loot nearby drops | F or walk near drops |
| Inventory/equipment | I |
| Merchant shop | B |
| Enhance equipped weapon | E |
| Toggle minimap | M |

## Class overview

| Class | Role | Weapon | Attack type |
| --- | --- | --- | --- |
| Warrior | Durable front-liner with strong mitigation | Blade + war shield | Melee |
| Trojan | Fast dual-weapon duelist with burst mobility | Twin sabres | Melee |
| Archer | Mobile ranged fighter with scatter shots | Composite bow | Ranged |
| Taoist | Spellcaster with long-range magic and healing | Prayer staff | Magic |

## Run locally

```bash
pnpm install
pnpm run dev -- --port 4177 --strictPort
```

Then open <http://127.0.0.1:4177>.

## Build

```bash
pnpm run build
```

## Deploy

This repo is configured for Vercel with `vercel.json`:

```bash
pnpm dlx vercel@latest link --yes --project jade-dominion-arena
pnpm dlx vercel@latest deploy --prod --yes
```

Vercel settings:

- Framework: Vite
- Install command: `pnpm install --frozen-lockfile`
- Build command: `pnpm run build`
- Output directory: `dist`

## Debug API examples

```js
window.__jadeDominionDebug.start()
window.__jadeDominionDebug.state()
window.__jadeDominionDebug.startAs('taoist', 'Ming Lotus')
window.__jadeDominionDebug.buy('health')
window.__jadeDominionDebug.enhance('weapon')
window.__jadeDominionDebug.runCombatProbe()
```

## Verification

Recent local verification included:

- `pnpm run build` passing TypeScript and Vite production build.
- Browser debug probes for class selection, class stats, potion hotkeys, merchant buy/sell, equipment enhancement, minimap toggle/reset, combat log reset, and ranged attacks.
- Browser console/error checks after interaction.
- Screenshot/pixel metrics confirming the Three.js world and HUD panels render.

## Known limitations

- This is a local single-player feature slice, not a networked MMORPG server.
- The art is procedural geometry/materials rather than authored character rigs or licensed models.
- No license has been selected yet; public visibility does not grant reuse rights beyond what GitHub permits for viewing/forking under its terms.
