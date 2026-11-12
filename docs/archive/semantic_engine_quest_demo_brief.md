# Brief: RobCo Semantic Engine Demo — "Unlimited Outcomes, One Room"

## What you're building
A single self-contained HTML file (no build step, inline JS/CSS, CDN-only if you need a library)
demonstrating that a quest can have unlimited resolution paths while the simulation underneath
stays 100% deterministic and replayable. This is a proof-of-concept for the RobCo Engine's
core thesis, not a full game.

Output filename must be descriptive, e.g. `greatsprings_semantic_quest_demo_ollama.html` —
never a generic name like `demo.html`.

## The one rule that matters more than any other
**The LLM never decides what happens. It only proposes what the player might mean, and
narrates what already happened.** Every fact in the narration must trace back to something
already committed to the deterministic log. If you catch yourself letting the model's text
output directly become a game-state change, stop — that's the failure mode this whole demo
exists to prove doesn't have to happen.

Concretely, the pipeline is:

```
Player free text
   │
   ▼
Membrane        — LLM call #1 (parse). Converts free text into a Contract:
   │               a small typed struct (verb enum + target id + optional
   │               argument-tag enum). Temperature 0. If the model can't map
   │               the text to a valid Contract shape, that's not an error —
   │               it's a Contract that will fail a gate below, same as if a
   │               player typed nonsense at an old text parser.
   ▼
ZAX             — pure function, zero LLM involvement. Four gates in fixed
   │               order, first failure wins: Authority → Possibility →
   │               Knowledge → Integrity. Returns a Verdict(ok, failedGate, reason).
   ▼
Organs          — ONLY runs if ZAX passed. Deterministic consequence functions
   │               (CombatOrgan, PersuasionOrgan, InventoryOrgan). Same inputs +
   │               same RNG state → same outputs, always. Organs never decide
   │               whether an act is allowed — that was ZAX's job already.
   ▼
Vault           — append this action + its Verdict + its resulting deltas as
   │               one line of history. This is the replay log.
   ▼
Canon check     — after every Commit, check whether the active Quest's goal
   │               predicate now holds against current Instance/Canon state.
   ▼
Narration       — LLM call #2. Given ONLY the Vault entry that was just
                    written (verb, target, verdict, deltas — no invented facts),
                    produce one or two sentences of in-voice prose. This call
                    may run at whatever temperature you like; it cannot affect
                    game state, so its non-determinism is harmless.
```

If asked to justify a design choice, justify it against this pipeline, not against
"what would make a good chatbot response."

## The room
One cell. Keep it a literal single room — this demo is about outcome-breadth, not
world-breadth. A 5x5 or so abstract grid is enough; you only need positions for one
purpose: reach. Melee weapons require the attacker to be adjacent to the target;
ranged weapons don't. That's the entire mechanical justification for having two
weapon types — don't spend effort on damage-tuning between them.

**Entities:**
- Player — has Strength/Charisma-equivalent stats (2–3 numbers is enough), an
  inventory, one equipped weapon slot.
- 2 weapons: one melee (e.g. Knife), one ranged (e.g. 9mm Pistol). Reuse the
  `value/weight/health` shape from the existing weapons catalog if convenient;
  none of those fields matter for this demo except whatever drives damage.
- 2 enemies, deliberately asymmetric so the "befriend everyone" test case is a
  real test and not a freebie:
  - Enemy A: aggressive, high hostility floor, hard to talk down.
  - Enemy B: nervous/conscripted, lower hostility floor, easy to talk down.
- 2 NPCs:
  - NPC1: the quest giver / the person at risk. Her safety is the win condition.
  - NPC2: a bystander who reacts (briefly, in narration only) to how the quest
    resolved — this is a cheap way to show the Overseer reading Canon after
    the fact rather than authoring new facts.

## The quest — defined as a goal-predicate, NOT a branching tree
This is the single most important part of the brief. Author the quest like this:

```
Quest: ProtectNPC1
Goal predicate: for every enemy in FactionA,
                 enemy.state ∈ { Dead, Fled, Pacified }
                 AND NPC1.state != Dead
Fail predicate:  NPC1.state == Dead
```

Do NOT author "if player attacks → outcome A; if player talks → outcome B" branches.
The predicate is checked against live Instance state after every single Commit,
regardless of which verb produced that state change. Combat, persuasion, bribery,
scaring an enemy off, or removing NPC1 from danger entirely should all be capable
of satisfying the same predicate through completely different Vault histories.
That's what "unlimited outcomes" means here: a fixed, small predicate, satisfied
by an open set of paths, because the paths are built from a general verb set,
not from authored branches.

## Verb set (closed enum — Contracts can only ever be one of these)
Extend the existing 8-verb set with social verbs:

- `Attack(target)` — melee requires adjacency; ranged doesn't.
- `Persuade(target, argumentTag)` — argumentTag ∈ {Logic, CommonGround, Bribe, Threat}
  (closed enum, not free text — Bud maps the player's prose onto one of these tags,
  it does not invent new tags).
- `GiveItem(target, itemId)` — can back a Bribe argument.
- `Move`, `PickUp`, `Equip`, `Unequip` — as already specified in the runtime doc.

Keep the set this small. If you find yourself wanting a verb for "do a clever
specific thing," that's a sign it should be an argumentTag or an Organ behavior,
not a new verb — the verb set stays closed and small on purpose (Law 5).

## Disposition — reuse the menace-scalar pattern, don't invent a parallel system
Each enemy has a `disposition` scalar (0 = hostile/attacking, 100 = pacified/friendly).
It is computed/mutated by PersuasionOrgan at the moment a Persuade Contract passes
ZAX — never stored as a bare boolean, never touched directly. A successful Persuade
above threshold flips the enemy to `Pacified` (stops attacking; becomes narratively
neutral or allied — your call). Combat state should make Persuade harder (higher bar,
or Possibility-gated out entirely if you want a cleaner story — pick whichever keeps
Organs and ZAX from overlapping responsibilities). ZAX gates whether an attempt is
even coherent (Possibility: is the target within earshot, not already fled, etc.);
Organs compute the actual disposition delta from stats + argumentTag + a seeded RNG
roll. The formula's exact numbers are your call — the only hard requirement is that
it's a pure function of (stats, tag, current disposition, rng state).

## Overseer implementation (Bud)
Use a local Ollama endpoint (`http://localhost:11434/api/chat`), non-streaming,
`num_ctx` 4096, `num_predict` 200, model `llama3.1:8b` (fall back to `llama3.2:1b`
if you need it faster — Bud is allowed to be a little dumb, that's in character).

- **Parse call**: system prompt gives the model the closed verb/tag/target schema
  and instructs it to return ONLY JSON matching that schema, nothing else.
  Temperature 0. If parsing fails or the JSON doesn't validate against the schema,
  treat it as a Contract that will fail a gate (e.g., unknown target → Possibility
  fail) rather than a crash — surface it in-voice as Bud being confused.
- **Narration call**: system prompt gives the model ONLY the just-written Vault
  entry (verb, target, Verdict, deltas) and instructs it to narrate that and
  nothing else — no new facts, no predicting what happens next, no restating
  numbers as if they were lore. One or two sentences.

## UI requirements
- Single HTML file, inline everything.
- A Vault/event log panel — this is your Vault made visible. Show it as a plain
  scrolling list of committed events, not a chat transcript. This is the "receipts"
  view that proves determinism, distinct from Bud's narration panel.
- A separate narration panel for Bud's prose.
- Entity status shown via controlled vocabulary (HP, state: Alive/Fled/Pacified/Dead,
  disposition value) — not prose. Descriptors stay free text and Overseer-only;
  kind/state fields stay closed enums, per house style.
- A free-text input box for the player's intent, plus (optional but recommended)
  a lightweight verb/target picker as a fallback path if you're worried about
  parse-call reliability — doesn't have to be pretty, just needs to exist so the
  demo doesn't stall on a bad LLM parse.

## Acceptance tests (this is the actual deliverable — the demo isn't done until these pass)
1. Kill both enemies → quest completes, Vault shows two Dead-transition events,
   Bud's narration reflects a violent resolution.
2. Persuade both enemies to Pacified with zero Attacks issued → quest completes,
   Vault shows two Pacified-transition events, zero combat events, Bud's narration
   reflects a bloodless resolution. **This is the test that proves the claim.**
3. Mixed: kill Enemy A, pacify Enemy B → quest completes either way, no special-cased
   code path for "mixed" should exist — it falls out of the same predicate.
4. A failed Persuade attempt against Enemy A (the hard one) should be visibly harder
   to land than against Enemy B — confirm this isn't a coin flip, it's the disposition
   math working.
5. Save the seed + Vault command log after any of the above, reload, replay through
   ZAX from scratch, confirm final state hash matches. If it doesn't, something leaked
   non-determinism (almost certainly the parse call's temperature, or an Organ reading
   wall-clock/Math.random instead of the seeded RNG).

## Explicit do-not-do list
- Do not let the narration call introduce facts, numbers, or outcomes that weren't
  already in the Vault entry it was given.
- Do not let the parse call's output be applied directly as a state change — it is
  a Contract candidate, ZAX has to see it first, always.
- Do not author "if the player says X, then Y happens" branches anywhere. If you
  find yourself writing an if/else ladder keyed on parsed player text rather than
  on verb/argumentTag enums, that's the tree failure mode — stop and re-derive
  from the goal predicate instead.
- Do not add more than the specified verbs/tags. The breadth comes from the predicate
  being decoupled from the method, not from a large verb list.
