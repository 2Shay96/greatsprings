# RobCo Engine — Overseer Data Ledger (provenance-tagged)

**What this is:** the *complete* current contents of every registry the Overseer
proposes from, across `robco-deck.js`, `canon-stress.js`, and `parser-gauntlet.js`.
Every entry is tagged so you can see exactly what is real FNV data and what I invented
to make the engine runnable. **This is a working ledger, not a finished dataset.** When
you extract the real FNV data, replace the `[INVENTED]` rows and flip the tags.

## Provenance tags
- `[REAL-FNV]` — a real Fallout: New Vegas thing, to the best of my knowledge.
- `[REAL?]` — probably real, but I'm not certain of the exact stats/requirements. **Verify.**
- `[INVENTED]` — I made this up. **Must be replaced with real data.**
- `[MISCATEGORIZED]` — a real thing, but I put it in the wrong bucket (see fixes).

---

## ⚠ Structural fixes owed before content (you caught these)

1. **`legionary` / `ncr_trooper` are NOT creatures.** They are *humans* with a *faction
   allegiance*. The current `bestiary` set conflates three different axes that must be
   separated:
   - **species** — what it physically is (`species.gecko`, `species.super_mutant`)
   - **faction** — who it serves (`faction.legion`, `faction.ncr`, `faction.powder_gangers`)
   - **named individual** — who it specifically is (`npc.gs.bonesaw`)
   A human is `species.human` + a `faction.*` tag + (optionally) a named NPC record. A
   super mutant can also carry a faction tag. One flat `bestiary` set cannot represent this.

2. **"Regard" is not an FNV mechanic. I invented it.** FNV uses **Reputation** (per-faction,
   with independent **Fame** and **Infamy** axes) plus a separate **Karma** track. A single
   bidirectional scalar is a *worse* model than the 2010 game shipped. The whole affinity
   system needs to be rebuilt on the real Fame/Infamy + Karma model. **I do not currently
   have the real tier names or thresholds — that's a priority extraction.**

---

## REGISTRY: Species / creatures
Source: `canon-stress.js` bestiary + `parser-gauntlet.js`. **All HP values are `[INVENTED]`.**

| ID (proposed) | Real creature? | HP (mine) | Tag |
|---|---|---|---|
| species.super_mutant | yes | 140 | `[REAL-FNV]` name, `[INVENTED]` hp |
| species.nightkin | yes | — | `[REAL-FNV]` |
| species.ghoul | yes | — | `[REAL-FNV]` |
| species.feral_ghoul | yes | — | `[REAL-FNV]` |
| species.gecko | yes | 25 | `[REAL-FNV]` name, `[INVENTED]` hp |
| species.brahmin | yes | — | `[REAL-FNV]` |
| species.bighorner | yes | — | `[REAL-FNV]` |
| species.radscorpion | yes | — | `[REAL-FNV]` |
| species.bark_scorpion | yes | — | `[REAL-FNV]` |
| species.coyote | yes | — | `[REAL-FNV]` |
| species.nightstalker | yes | — | `[REAL-FNV]` |
| species.cazador | yes | — | `[REAL-FNV]` |
| species.deathclaw | yes | — | `[REAL-FNV]` |
| species.molerat | yes | — | `[REAL-FNV]` |
| species.mantis | yes | — | `[REAL?]` (giant mantis exists; exact id verify) |
| species.robot / securitron | yes | — | `[REAL-FNV]` (Securitron is real; "robot" is a category) |
| ~~creature.legionary~~ | NO — human+faction | 90 | `[MISCATEGORIZED]` → species.human + faction.legion |
| ~~creature.ncr_trooper~~ | NO — human+faction | 80 | `[MISCATEGORIZED]` → species.human + faction.ncr |
| ~~creature.raider~~ | NO — human+faction | — | `[MISCATEGORIZED]` → species.human + faction.* |

**Gap:** I am almost certainly missing many real creatures (Lakelurks, Fire Geckos,
Giant Rats, Spore Carriers/Plants, Tunnelers from Lonesome Road, Ants, etc.). The real
creature list should come from the extraction.

---

## REGISTRY: Factions
Source: `parser-gauntlet.js`. **Disposition numbers are `[INVENTED]`.**

| ID | Real faction? | Default disp (mine) | Tag |
|---|---|---|---|
| faction.legion | yes (Caesar's Legion) | -40 | `[REAL-FNV]` name, `[INVENTED]` number |
| faction.ncr | yes (New California Republic) | 0 | `[REAL-FNV]` name, `[INVENTED]` number |

**Gap (large):** missing every other major faction — Powder Gangers, Great Khans,
Boomers, Brotherhood of Steel, Followers of the Apocalypse, the Strip families
(Chairmen, Omertas, White Glove Society), Mr. House / Securitrons, Goodsprings,
Primm, Novac, etc. **The faction table + the inter-faction disposition matrix is a
priority extraction**, because Reputation hangs off it.

---

## REGISTRY: Reputation / Karma  ← **the big rebuild**
Source: I invented a single "Regard" scalar (-100..+100). **This is wrong for FNV.**

- **Currently in engine:** `regard[npc][target]`, one number, clamped ±. `[INVENTED]`
- **Should be:** per-faction **Reputation** with independent **Fame** and **Infamy**
  values that combine into a displayed standing tier, **plus** a separate global **Karma**
  track. `[REAL-FNV model — but I don't have the real tier names/thresholds]`

**What I need extracted:** the real reputation tier names and their Fame/Infamy
breakpoints (the Idolized/Liked/Neutral/Disliked/Vilified-style ladder — I am NOT
confident I have these right, so I'm not listing fake numbers here), how Fame and
Infamy combine, and the Karma tiers. **Until I have these, the affinity system stays
stubbed and flagged.**

---

## REGISTRY: Skills (the check taxonomy)
Source: `parser-gauntlet.js`.

| Skill | Real FNV skill? | Tag |
|---|---|---|
| Speech | yes | `[REAL-FNV]` |
| Barter | yes | `[REAL-FNV]` |
| Sneak | yes | `[REAL-FNV]` |
| Lockpick | yes | `[REAL-FNV]` |
| Medicine | yes | `[REAL-FNV]` |
| Science | yes | `[REAL-FNV]` |
| Explosives | yes | `[REAL-FNV]` |
| Guns | yes | `[REAL-FNV]` |
| Melee (Melee Weapons) | yes | `[REAL-FNV]` |

**Missing real FNV skills:** Energy Weapons, Unarmed, Repair, Survival. **The check
*difficulty numbers* in `ACTION_CHECK` (touch=30, grope=60, activate=55, etc.) are
ALL `[INVENTED]`.** FNV speech checks use specific thresholds per dialogue node — those
come from the extraction.

---

## REGISTRY: SPECIAL
The 7 SPECIAL stats (STR, PER, END, CHA, INT, AGI, LCK) are `[REAL-FNV]` — this is the
correct attribute model. Lucie's specific values are an invented character build (below).

---

## REGISTRY: Items / weapons
Source: `parser-gauntlet.js`. **All stats `[INVENTED]` unless noted.**

| ID | Real item? | Skill (mine) | Dmg (mine) | Tag |
|---|---|---|---|---|
| item.caps | yes (Bottle caps = currency) | — | — | `[REAL-FNV]` |
| item.9mm_pistol | yes | Guns | 18 | `[REAL-FNV]` name, `[INVENTED]` dmg |
| item.combat_knife | yes | Melee | 12 | `[REAL-FNV]` name, `[INVENTED]` dmg |
| item.stimpak | yes | Medicine | — | `[REAL-FNV]` |
| item.frag_grenade | yes | Explosives | 60 | `[REAL-FNV]` name, `[INVENTED]` dmg |

**Gap (huge):** this is 5 items. FNV has hundreds (weapons, armor, aid, ammo types,
misc/junk, unique weapons). The real weapon table — with real damage, DPS, skill,
value, weight, ammo, and crit data — is a core extraction target.

---

## REGISTRY: Perks
Source: `parser-gauntlet.js`. **Prerequisites are `[REAL?]` at best — verify all.**

| ID | Real perk? | Prereq (mine) | Tag |
|---|---|---|---|
| perk.black_widow | yes | CHA 6 | `[REAL-FNV]` perk, `[REAL?]` prereq (I think it's level-based, not CHA — **verify**) |
| perk.confirmed_bachelor | yes | CHA 6 | `[REAL-FNV]` perk, `[REAL?]` prereq |

**Note:** Cherchez La Femme (female→female equivalent) is also `[REAL-FNV]` and missing.
**Gap:** FNV has ~88 regular perks. I have 2, with shaky prereqs.

---

## REGISTRY: Traits
Source: `parser-gauntlet.js` + Lucie's sheet. **Read this carefully — invented ones here.**

| ID | Real trait? | Tag |
|---|---|---|
| trait.four_eyes | yes (+1 PER w/ glasses, -1 without) | `[REAL-FNV]` |
| trait.light_step | **NO — this is a PERK, not a trait** | `[MISCATEGORIZED]` real thing, wrong bucket |
| trait.silver_tongued | **I cannot confirm this is in FNV.** Likely invented or from another game | `[INVENTED]` until proven |
| trait.cheeky | **Invented. Not an FNV trait.** | `[INVENTED]` |
| (trait.voluptuous) | **Invented. Not an FNV trait.** Referenced in dialogue earlier | `[INVENTED]` |

**FNV has exactly ~10 real traits** (e.g. Built to Destroy, Fast Shot, Good Natured,
Heavy Handed, Kamikaze, Loose Cannon, Small Frame, Trigger Discipline, Wild Wasteland,
Four Eyes, Skilled). I should use **that closed list**, not invent flavor traits.

---

## REGISTRY: Spaces
Source: `robco-deck.js` + `canon-stress.js`. These are **bespoke to our scene**, not from FNV.

| ID | Tag |
|---|---|
| space.gs.road | `[INVENTED]` (our scenario — a road N of Goodsprings; Goodsprings itself is `[REAL-FNV]`) |
| space.gs.ridge | `[INVENTED]` (authored mid-session for the Legion scout) |

---

## REGISTRY: Quests
| ID | Tag |
|---|---|
| quest.gs.toll | `[INVENTED]` (Bonesaw's road toll — our fiction, not a real FNV quest) |

---

## INSTANTIATED NPCs (live in our current scene)

| ID | Basis | Tag |
|---|---|---|
| npc.gs.bonesaw | super mutant guarding a road | `[INVENTED]` character. "Bonesaw" is our creation; super mutants are `[REAL-FNV]` |
| npc.legion.scout | the scout we spawned to make Lucie's bluff real | `[INVENTED]` instance of a `[REAL-FNV]` archetype (Legion scout) |

**Note:** Real FNV Goodsprings characters (Sunny Smiles, Trudy, Doc Mitchell, Ringo,
Joe Cobb, Chet, Easy Pete, Victor) are all `[REAL-FNV]` and currently absent from the
engine. Bonesaw is a homebrew NPC, which is fine for a sandbox but should be labeled.

---

## Lucie (the player character sheet)
Source: `parser-gauntlet.js`. **Entirely an invented character build.** This is fine —
she's a custom player character — but none of these numbers are "FNV canon," they're a
build I authored:

- Level 3, HP 95 `[INVENTED]`
- SPECIAL: STR 4 / PER 6 / END 5 / CHA 8 / INT 6 / AGI 7 / LCK 5 `[INVENTED build]`
- Skills: Speech 58, Sneak 46, Guns 41, Melee 28, Lockpick 35, Science 10, Medicine 22, Explosives 15 `[INVENTED]`
- Perks: Black Widow `[REAL-FNV perk, invented that she has it]`
- Traits: Silver-Tongued `[INVENTED]`, Light Step `[MISCATEGORIZED]`, Four Eyes `[REAL]`, Cheeky `[INVENTED]`
- Inventory: 37 caps, 9mm pistol, combat knife, 2 stimpaks `[INVENTED loadout of REAL items]`

---

## Priority extraction list (what I need from you, ranked)

1. **Reputation/Karma schema** — Fame/Infamy tier names + thresholds, how they combine,
   Karma tiers. *(Blocks the entire affinity rebuild that replaces my fake "Regard".)*
2. **Faction table + inter-faction disposition matrix** — all major factions and how they
   feel about each other and the player. *(Reputation hangs off this.)*
3. **Creature/species table** — the real list, with the game's own creature-vs-character
   split, and base stats (HP, DT, etc.).
4. **Skills** — the full 13-skill list (I'm missing Energy Weapons, Unarmed, Repair,
   Survival) and how speech-check thresholds are set per dialogue.
5. **Perks (~88) + Traits (~10 closed list)** — real names + real prerequisites.
6. **Weapon/item table** — real damage/skill/value/weight/ammo. (Can be a curated subset
   to start — the weapons that actually appear in our early scenes.)

**Format:** JSON or structured text ideal; raw wiki category dumps / CSV fine — I'll
normalize into clean registries (`species.*`, `faction.*`, `weapon.*`, `perk.*`,
`trait.*`, `reputation.*`). Curated subsets are enough to start the HTML; the full
tables can follow via Claude Code on the PC.
