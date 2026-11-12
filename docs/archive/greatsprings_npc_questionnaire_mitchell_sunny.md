# Greatsprings NPC Questionnaire — Doc Mitchell & Sunny Smiles

**Purpose:** Seed data for the Holotape definitions of these two NPCs. Everything tagged
`[LORE]` or `[DATA]` is already established — don't second-guess it without reason.
Everything tagged `[FILL]` is a genuine blank. Everything tagged `[GAP]` is a data or
canon hole I found while compiling this, flagged so it doesn't silently become a wrong
assumption later.

**Legend**
- `[LORE]` — confirmed Fallout: New Vegas canon (paraphrased from the Fallout Wiki, dev
  statements, or in-game systems; not verbatim dialogue)
- `[DATA]` — pulled directly from your ESM extraction (`goodsprings_cast.json`,
  `doc_mitchell_house.json`)
- `[INFERRED]` — a reasonable guess built from `[DATA]` (an object in the house, a
  schedule package name) but not dialogue-confirmed — treat as a lead, not a fact
- `[GAP]` — a hole worth closing before you build on top of it
- `[FILL]` — blank, yours to answer

---

## 1. DOC MITCHELL

### 1.1 Identity

| Field | Value |
|---|---|
| Formid | `00104C0C` `[DATA]` |
| EDID | `DocMitchell` `[DATA]` |
| Display name | Doc Mitchell `[DATA]` |
| Role | Town doctor / surgeon of Goodsprings `[LORE]` |
| Home cell | `00103DF9` — Doc Mitchell's House `[DATA]` |

**What is Doc's age?** `[FILL]` — never stated in canon. He reads as late-middle-age to
elderly given the "childhood sweetheart... eventually married" timeline and his current
retirement.

**What does he look like — build, hair, clothing, distinguishing marks?** `[FILL]`
Canon gives you almost nothing visual beyond his character model and voice. Open canvas.

---

### 1.2 Backstory `[LORE]`

Doc Mitchell was born in Vault 21, under the New Vegas Strip, where the other kids
nicknamed him "Mole Butt." When Robert House won the vault in a card game and evicted
most of its residents during the Strip's redevelopment, Mitchell left and became a
traveling doctor — medical knowledge being rare and valuable among the wasteland's
mostly-uneducated population. He eventually returned to Vault 21 to marry his childhood
sweetheart. The two set out for California together, but her immune system, weakened by
a lifetime of vault isolation, gave out from illness near Goodsprings. She died there.
With no reason left to keep moving, Mitchell settled in Goodsprings to stay close to her
grave, and became the town's doctor. He now runs a small clinic out of his house, treats
locals and travelers, and — per Obsidian's Josh Sawyer — is the one who patches up the
Courier after they're shot and buried at the start of the game.

**Does he have a real first name, beyond "Doc"?** `[FILL]`

**What's your version of his wife — name, personality, how they met in the vault?**
`[FILL]` — canon leaves this completely open.

---

### 1.3 Home & Location

Doc Mitchell's House `[DATA: 00103DF9]` is a converted single-story home: clinic and
living room on one side (operating table, gurney, IV stand, anesthesia machine, Vit-o-
Matic Vigor Tester), kitchen/bedroom/bathroom on the other. It's also the game's opening
location. `[LORE]`

**Does he still see patients daily, or has that dried up as the town's shrunk?** `[FILL]`

---

### 1.4 Affiliations & Relationships

- Carries `GoodspringsMilitiaTravelPackage` in his schedule — he turns out for the town's
  defense during Ghost Town Gunfight. `[DATA]` Canon backs this up: he'll hand out
  stimpaks and doctor's bags to defenders, though he says outright he's "not much good in
  a fight" on account of his leg. `[LORE]`
- Unlike Chet and Trudy, he'll buy back stolen goods — a quiet signal that he doesn't
  moralize much about where things come from. `[LORE]`
- Known and remembered by Sarah Weintraub, the current keeper of Vault 21 on the Strip —
  she still calls him "Mitch" and knows the "Mole Butt" nickname. `[LORE]`
- No confirmed close friendship written with Trudy or Chet beyond "everyone in a small
  town knows everyone" — he can tell the Courier who they are and where the store is.
  `[LORE]`

**Clan/faction affiliation:** None confirmed. `[LORE]` Goodsprings itself sits on old NCR
mining-grant land, but neither Doc nor the town has active NCR rank or presence.
**Do you want to invent one for Greatsprings — an old military unit, a vault faction, a
debt to someone?** `[FILL]`

**Who does he dislike, distrust, or avoid in town?** `[FILL]`

---

### 1.5 Daily Schedule

| PACK EDID | Formid | Note |
|---|---|---|
| GoodspringsMilitiaTravelPackage | 0015ED62 | shared w/ Sunny, Trudy, Easy Pete |
| VCG01DocMitchellSandbox | 0010B756 | |
| VCG01DocMitchellFarewellDialogueStart | 00105BD2 | |
| VCG01DocMitchellTravelToExit | 00105BD1 | |
| VCG01DocMitchellTravelToExamSpot | 001055BD | |
| VCG01DocMitchellTravelToSkullTestSpot | 0010B046 | |
| VCG01DocMitchellTravelToPlayerAtTester | 00104C1E | |
| VCG01DocMitchellBedsideStandingPackage | 00107238 | |
| VCG01DocMitchellFirstPosition | 00104C1D | |

**Verified:** all 9 of Doc's AI packages carry unconditional PSDT (month/day/date/time =
-1). `[DATA — verified PSDT decode]` That means **Doc has no clock-driven daily routine
at all** — every package is intro-quest choreography (walk to the Vigor Tester, walk to
the exam spot, stand bedside, etc.), not a "wakes at 6, opens clinic at 8" loop like
Chet, Ringo, or Sunny have.

**This is a real design gap, not just a missing field.** If Greatsprings NPCs are meant
to have believable daily rhythms once the intro sequence is behind them, Doc's original
game literally never needed one — he's a tutorial fixture first, a town resident second.

**What does Doc actually do on an ordinary day, once the Courier's gone?** `[FILL]`
- Wakes at: ____
- Opens the clinic at: ____
- Meals at: ____
- Closes up / sleeps at: ____
- Anything he does only on certain days (militia drills, restocking trips to Chet's)?
  ____

---

### 1.6 Voice & Speech `[LORE, paraphrased]`

Slow, deliberate, folksy cadence — he talks like a man with nowhere urgent to be. Warm
but not chatty; he'll answer questions plainly and doesn't dress things up. Deflects
questions about his own past ("not real proud of it" register) without being cagey about
it — he just doesn't dwell.

**Verbal tics, catchphrases, things he says when annoyed / pleased / worried?** `[FILL]`

---

### 1.7 Personality `[LORE]`

Generous almost to a fault — hands the amnesiac Courier a free jumpsuit, a Pip-Boy, and
a weapon on their way out the door. Calm, non-confrontational, pragmatic about violence
(he'll help defend the town with supplies, not a gun). Doesn't moralize about a
customer's past. Quietly grieving — settled in Goodsprings specifically to stay near his
wife's grave, but it's mentioned once and dropped, never performed as ongoing sorrow.

**Want / Need / Fear (the three-line RPG-writing shorthand):** `[FILL]`
- Wants: ____
- Needs (doesn't know he needs it): ____
- Fears: ____

**Flaws, blind spots, moral lines he won't cross?** `[FILL]`

**Sense of humor — dry, warm, absent?** `[FILL]`

---

### 1.8 Preferences

Nothing here is dialogue-confirmed. What follows is `[INFERRED]` from his house
inventory — treat as leads, not answers.

- **Smoker?** Inferred — 3 packs of cigarettes, 1 carton, 2 ashtrays in the house.
- **Coffee drinker?** Inferred — 2 coffee mugs, a coffee pot, and a coffee brewer.
- **Plays chess?** Inferred — one chessboard, sitting somewhere in the house.
- **Keeps a baseball and glove** — sentimental object? His own youth, a memento of his
  wife, something else entirely? `[FILL]`
- **Pantry stock:** Cram, Pork N' Beans, Sugar Bombs, flour, yeast (implies he bakes, or
  at least keeps bread ingredients) `[DATA]`

**What is Doc's favorite meal?** `[FILL]`
**Favorite drink (beyond coffee)?** `[FILL]`
**Music, if any exists in Greatsprings' world?** `[FILL]`
**Pet peeves?** `[FILL]`

---

### 1.9 Possessions (from house extraction) `[DATA]`

| Item | Notes |
|---|---|
| Doctor's Bag, Stimpaks (x3), Rad-X, Antivenom, Med-X, Blood Pack | working clinic stock |
| Operating table, gurney, IV stand, anesthesia machine, ophthalmoscope, microscope | full surgical setup |
| Chemistry Set | player can craft 5 Stimpaks or a chem at Science 25 `[LORE]` |
| Broken 9mm Submachine Gun | repairable at Repair 25 `[LORE]` |
| Laser Pistol, in a gun case | see 1.10 below |
| Knife | kept near the first-aid kit in a footlocker |
| Crutch (x2) | corroborates the "bum leg" dialogue |
| Reading Glasses | |
| Pre-War Hat | |
| Chessboard, Camera, Typewriter, Telephone | personal effects |

**What's the one object in his house you'd call irreplaceable to him?** `[FILL]`

---

### 1.10 Combat Behavior

Two slightly conflicting canon accounts of what Doc does if attacked in his own house:
one says he runs for the laser pistol in the gun case; another says he goes for the
knife in the footlocker instead. `[LORE — sources disagree]` His own house data confirms
**both objects exist** `[DATA]`, so either is plausible — worth deciding definitively for
Greatsprings rather than inheriting the ambiguity.

He is explicitly not a fighter — bad leg, thin supplies, says so himself. `[LORE]`

**Pick one: does Greatsprings-Doc reach for the blade or the pistol? Or does he flee /
barricade instead?** `[FILL]`

---

### 1.11 Secrets / Hidden Depths `[FILL]`

Canon gives you almost nothing to contradict — this is wide open. Some prompts:
- Does he know more about the Courier's shooter than he lets on?
- Is there guilt buried in "not proud of" his traveling-doctor years — a patient he
  couldn't save, a debt he ran from?
- Does he still talk to his wife, in the way people do?

---

### 1.12 Engine Hooks

**ZAX Knowledge-gate seed** — what does Doc know at scene start, before the player has
told him anything? `[FILL]` (This maps directly to the Gate 3 witness system you've
scoped for v0.2 — worth answering in the same pass as Sunny's, since Doc is your test
case for "an NPC who knows something the player hasn't said yet.")

---
---

## 2. SUNNY SMILES

### 2.1 Identity

| Field | Value |
|---|---|
| Formid | `00104E84` `[DATA]` |
| EDID | `GSSunnySmiles` `[DATA]` |
| Display name | Sunny Smiles `[DATA]` |
| Role | Town guard, gecko trapper/hunter `[LORE]` |
| Home cell | **not captured in your extraction** — see 2.3 `[GAP]` |

**Age?** `[FILL]` — unstated. Reads as young adult given her role as the active
hunter/guard rather than an elder.

**Physical description — build, hair, scars, clothing wear?** `[FILL]` One community
source claims her character model is scaled ~95% of average NPC height; treat that as
unverified fan-wiki trivia, not something to build mechanics on. `[GAP]` If you want a
real answer, check her NPC record's height field directly rather than trusting that
number.

---

### 2.2 Backstory `[LORE]`

A skilled trapper and survivalist who moved to Goodsprings sometime before 2281 — where
she came from before that is never stated. She keeps the gecko population around town
thinned for meat and hides (sold to Chet), and keeps radscorpions and coyotes off the
town's water source. She's the first NPC to hand the Courier a weapon (a Varmint Rifle)
and walk them through wasteland basics — hunting, cooking, crafting — functioning as a
short-term tutorial companion.

**Where was she before Goodsprings? Family, prior settlement, why she left?** `[FILL]` —
completely open; canon never touches it.

---

### 2.3 Home & Location

**Data gap:** unlike Chet, Trudy, Doc, Ringo, and the Settler NPCs, Sunny's record in
`goodsprings_cast.json` has no `home_cells` entry at all. `[GAP]` Worth re-running the
extractor against her specific NPC record or checking if her home cell is set via a
different mechanism (e.g. no explicit home, uses a package-driven location instead).

Canon gives a location lead: she spends downtime in the Prospector Saloon with her dog,
Cheyenne. `[LORE]`

**Does she actually live at the saloon, or somewhere of her own — a tent, a lean-to, a
room over the general store?** `[FILL]`

---

### 2.4 Affiliations & Relationships

- Dog: **Cheyenne** — loyal, fights alongside her, will attack anyone who attacks Sunny.
  `[LORE]`
- Carries `GoodspringsMilitiaTravelPackage`, same as Doc — she's part of the town's
  informal defense. `[DATA]`
- Confirmed friendly relationships: Doc Mitchell, Easy Pete, the Courier. `[LORE]`
- Confirmed antagonism: Joe Cobb and the Powder Gangers. `[LORE]`
- Informal trade relationship with Chet (sells him gecko hides). `[LORE]`
- Has heard of, but never encountered, Caesar's Legion — treats reports of them as
  secondhand rumor, notably skeptical that the stories are exaggerated by the NCR.
  `[LORE]`

**Clan/faction affiliation:** None confirmed, same as Doc. `[LORE]`
**Family? Romantic history? Someone she lost, given the game hints at grief she's
carrying?** `[FILL]` — canon includes a line where she blames herself after someone dies
on her watch and asks Cheyenne why she didn't stay back; the identity of who died and
the full circumstance are never specified. That's a real emotional thread you could
build on, not an invented one. `[LORE, underspecified]`

---

### 2.5 Daily Schedule

| PACK EDID | Formid | Note |
|---|---|---|
| SunnyMeetPlayerDialoguePackage | 00105CC7 | quest choreography |
| VCG02SunnySmilesDialogueStart | 0010A21A | quest choreography |
| SunnySmilesStayAtCurrentLocation | 0010A21C | quest choreography |
| VCG02SunnySmilesDialogueSneakEnd | 0010A219 | quest choreography |
| VCG02SunnySneakCloserToWell | 0010A217 | quest choreography |
| VCG02SunnySmilesDialogueSneakStart | 0010A218 | quest choreography |
| VCG02SunnyTravelOutside | 0010A216 | quest choreography |
| VCG02SunnyTravelToWell1 / 2 / 3 | 0010A21B / 0010A215 / 0010A21D | quest choreography |
| VCG03SunnyTravelToCampfire | 0015D9F5 | quest choreography |
| GoodspringsMilitiaTravelPackage | 0015ED62 | shared w/ Doc, Trudy, Easy Pete |
| **GSSunnySleepPackage0x8** | 00176AD3 | **genuine clock-gated sleep block** |
| DefaultStayAtEditorLocation | 000200D5 | engine default/fallback |

Unlike Doc, Sunny is one of the NPCs confirmed to carry a genuine clock-time-gated PSDT
record — she has a real sleep/wake loop, not just quest choreography. `[DATA — verified
category, per your PSDT decode pass]` **Not yet individually decoded:** the exact start
hour of `GSSunnySleepPackage0x8` hasn't been pulled from the PSDT bytes yet — the naming
convention elsewhere (`Sleep22x8` = start 22:00, 8 hours) doesn't hold here (`0x8` reads
as start 0:00), and you've already caught one case (Easy Pete's chair package) where the
EDID name lied about the actual decoded time. `[GAP]` Worth putting on the same decode
backlog before you treat "midnight" as fact.

**What does she do during daylight hours — patrol route, hunting grounds, time at the
well vs. the saloon?** `[FILL]`
**Wakes at:** ____ **Sleeps at:** ____ (pending decode)
**Does she hunt on a schedule, or opportunistically when the gecko population needs
thinning?** `[FILL]`

---

### 2.6 Voice & Speech `[LORE, paraphrased]`

Blunt, practical, no wasted words. Protective register when talking about the town or
about people getting hurt. Dry rather than warm-humored. Initially wary of strangers,
including the Courier, before deciding they're worth trusting.

**Verbal tics, catchphrases?** `[FILL]`

---

### 2.7 Personality `[LORE]`

Protective to the point of guilt — takes it personally when someone gets hurt under her
watch. No-nonsense, community-minded, willing to put herself between the town and a
threat. Skeptical of secondhand rumor (the Legion comment) rather than credulous.
Determined, and — per her handing a stranger a rifle and teaching them to shoot — not
someone who hoards competence; she'd rather the people around her be capable too.

**Want / Need / Fear:** `[FILL]`
- Wants: ____
- Needs: ____
- Fears: ____

**Flaws, blind spots?** `[FILL]`
**Sense of humor?** `[FILL]`

---

### 2.8 Preferences `[FILL — nothing canonical here]`

- Favorite food: ____
- Favorite drink: ____
- Music: ____
- Hobbies beyond hunting: ____
- Pet peeves: ____
- How she feels about Cheyenne specifically — working dog, or family? `[FILL]`

---

### 2.9 Possessions `[LORE]`

- Varmint Rifle — the one she hands the Courier; presumably keeps one of her own
- Leather armor
- Toughness perk (10% damage resistance, on top of the armor's own DT)

**Personal effects, keepsakes, anything that ties to her unstated past?** `[FILL]`

---

### 2.10 Combat Behavior `[LORE]`

Genuine combatant — unlike Doc, she fights. Skilled marksman, Toughness perk, fights
alongside Cheyenne, becomes a temporary companion during the Ghost Town Gunfight
sequence. This is a real personality/mechanics split worth preserving: **Doc responds to
danger by handing out supplies; Sunny responds by picking up a rifle.**

---

### 2.11 Secrets / Hidden Depths `[FILL]`

- Who did she lose, that the "you shouldn't have to see me like this" grief line points
  at? Canon leaves this specific enough to be a hook, vague enough to be yours.
- Does she want to leave Goodsprings eventually, or is this home now?

---

### 2.12 Engine Hooks

**ZAX Knowledge-gate seed** — what has Sunny personally witnessed vs. only heard about
(the Powder Gangers, the Courier's shooting, Legion rumors)? `[FILL]` Worth writing
alongside Doc's — between the two of them you'd have one NPC who knows almost nothing
firsthand (Doc) and one who's an active witness to town threats (Sunny), which is a good
spread for testing Gate 3 once it's real.

**Combat AI note:** she's your first candidate for testing NPC-issued Commands that
aren't just movement/dialogue — a real `SufferDamage`/attack loop through the same
Command→ZAX→World→Event path as the player, once Authority stops being player-only.

---
---

## 3. Cross-cutting notes (found while compiling, not enrichment — flagging for you)

1. **Sunny's missing `home_cells`** is the one actual data gap here, not a lore gap.
   Every other named Goodsprings NPC has one. Worth a targeted re-check against the ESM
   before you build her Holotape around an assumed home location.
2. **Don't trust PACK EDID names for exact timing** — you already caught this once
   (Easy Pete's mislabeled chair package). `GSSunnySleepPackage0x8` is a second
   candidate for the same trap; decode it before writing "sleeps at midnight" into
   canon.
3. **Doc's zero-clock-schedule status is a genuine design decision point, not a content
   gap.** He was built purely as a tutorial fixture in the original game. If
   Greatsprings wants him to feel alive outside the opening sequence, that schedule has
   to be authored from scratch — there's no PSDT data to lean on the way there is for
   Sunny, Chet, or Trudy.
4. Two wiki sources disagree on Doc's default weapon-of-choice if attacked (knife vs.
   laser pistol) — flagged in 1.10. Pick one; don't inherit the ambiguity into a Holotape
   field that's supposed to be a closed enum.
