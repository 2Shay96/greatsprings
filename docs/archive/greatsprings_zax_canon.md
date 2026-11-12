# Greatsprings / RobCo Engine — ZAX Operational Canon
Trimmed from `robco-runtime-architecture-v0.1.md`. Core Inversion, Five Laws, and
lexicon are already in the ZAX system prompt — not repeated here. This file is the
part of the architecture doc that Instructions doesn't cover: the actual type
system, command set, gate logic, API surface, and known debt.

Supersession rule applies: if `robco-runtime-architecture-v0.1.md` changes, this
file changes the same day, or it's out of date and should not be trusted.

---

## 1. DATA FLOW (the whole engine on one diagram)

```
  Human input (WASD, E, TAB, clicks)
        │
        ▼
  Godot frontend  ──── draws boxes, owns movement physics, decides NOTHING
        │
        ▼
  Command          ──── an ATTEMPT, never authorship        [Commands.cs]
        │
        ▼
  World.Execute()  ──── the ONLY mutation entry point       [World.cs]
        │
        ▼
  ZAX: 4 gates     ──── Authority → Possibility →           [Zax.cs]
        │               Knowledge → Integrity (short-circuit)
        │
   pass │ fail ──────► Verdict(gate, reason) → logged, shown to player, nothing changes
        ▼
  Commit           ──── consequences applied                [World.cs, private]
        │
        ▼
  GameEvent → LOG  ──── the Vault: append-only history      [Events.cs]
        │
        ▼
  Frontend reads state, updates visuals
```

A save file = **seed + the successful commands in the log**. Loading replays every
command through ZAX against fresh content and proves the state hash matches.
Replay identity is the definition of done.

---

## 2. THE TYPE SYSTEM

### Definition — immutable, imported                     [Definitions.cs]
```
Id            formid string, e.g. "00015169"
Edid          greppable editor id, e.g. "Stimpak"
Name          display name
Kind          closed enum (below)
ItemClass     closed enum (below)
Value, Weight, Health (item condition pool)
DamageThreshold   armor DT (verified DNAM decode)
IsFood / IsMedicine   ALCH ENIT flags 0x02 / 0x04 (verified)
Bounds        OBND [x1,y1,z1,x2,y2,z2], FNV units
```

### Closed enums — adding a value is a DESIGN DECISION, never a runtime event
```
Kind:      Static · Item · Container · Door · Actor · Furniture · Activator · Light · Unknown
ItemClass: None · Weapon · Armor · Consumable · Misc
Gate:      None · Authority · Possibility · Knowledge · Integrity
```

### Instance — mutable, placed                            [Instance.cs]
```
Ref           placed-reference formid (identity)
DefId         → Definition
Pos, Rot, Scale    NATIVE FNV UNITS — the runtime never converts; renderers do
Taken         item removed from world
Opened        container looted at least once
Contents      List<ItemStack> — rolled once at Initialize(seed)
LootCandidates     imported leveled-list flattening
```

### ActorState                                            [Instance.cs]
```
Id, Name, Level
SPECIAL ×7    plain ints — NO clamping baked into the engine (game rules ≠ stats)
Damage        THE stored truth
MaxHealth     DERIVED  = 95 + Endurance×20 + Level×5     (FNV formula)
CurrentHealth DERIVED  = max(0, MaxHealth − Damage)
CarryCapacity DERIVED  = 150 + 10×Strength
Inventory     List<ItemStack>, kept in ordinal order (determinism)
EquippedWeapon / EquippedArmor    one slot each (v0)
```
**Health is never stored. Only damage is state.**

### Supporting records
```
ItemStack(DefId, Count)
LootCandidate(DefId, Count, ChanceNone)
Verdict(Ok, FailedGate, Reason)          ZAX's answer — never silent
GameEvent(Seq, ActorId, Verb, Detail, Ok, Reason)    one line of history
Rng          xorshift64* — OURS, not System.Random (replay survives .NET upgrades)
```

---

## 3. THE COMMAND SET (v0.1 — eight verbs)

| Command | Verb string | Args | Consequence on ZAX pass |
|---|---|---|---|
| PickUp | `pick_up` | Ref | Instance.Taken=true; +1 to inventory |
| DropItem | `drop` | DefId | −1 inventory; unequip if last; **item vanishes (v0)** |
| UseItem | `use` | DefId | consume; medicine: Damage−30; food: Damage−5 |
| EquipItem | `equip` | DefId | fills weapon or armor slot by ItemClass |
| UnequipItem | `unequip` | DefId | empties matching slot |
| TakeFromContainer | `take_from_container` | Ref, DefId, Count | transfer; Opened=true |
| TakeAll | `take_all` | Ref | transfer everything; Opened=true |
| SufferDamage | `suffer_damage` | Amount | Damage += Amount |

SufferDamage exists because a test once wrote `Damage = 50` directly and replay
identity broke instantly. **Even harm is an attempt.** Direct writes escape the Vault.

---

## 4. ZAX — THE FOUR GATES                                [Zax.cs]

Order is fixed. First failure wins. `ReachUnits = 180` (~2.6 m).

**Gate 1 · AUTHORITY — may this actor attempt this at all?**
- actor must exist
- actor must be alive ("dead actors attempt nothing")
- v0: only `player` issues commands ← **the wall v0.2 knocks down**

**Gate 2 · POSSIBILITY — is the act physically coherent?**
- target reference exists / not already taken
- kind rules: only Kind.Item is portable; only Kind.Container yields contents
- reach: distance(actor, target) ≤ 180 FNV units
- inventory rules: can't use/equip/drop what you don't carry
- class rules: only Consumables are usable; only Weapon/Armor equip

**Gate 3 · KNOWLEDGE — does the actor know enough?**
- v0: passes trivially for physical acts on visible objects
- **Reserved for the Overseer: Bud may not act on facts his Terminal never learned**

**Gate 4 · INTEGRITY — would committing corrupt invariants?**
- counts must be positive; damage must be positive
- grows as invariants grow

---

## 5. THE API SURFACE (everything a frontend may touch)

```
ContentLoader.LoadScene(sceneJson: string, seed: ulong) → World
      // JSON string in — the runtime does NO platform IO, ever

World.Execute(Command) → Verdict          // the only door
World.ReportPlayerPos(x, y, z)            // v0 hack: frontend owns movement physics
World.GetDefinition(id) / GetInstance(ref) / GetActor(id)
World.Player · World.Instances · World.Definitions · World.Log
World.CarriedWeight(actor)
World.StateHash() → ulong                 // FNV-1a over ordered state
World.Initialize(seed)                    // rolls container loot ONCE, deterministically

SaveGame.Save(World) → string             // seed + successful-command log
SaveGame.Load(sceneJson, saveJson) → World  // full replay through ZAX; throws on divergence
```

Frontends read state and submit commands. **They never decide anything.**
Bridge.cs (Godot side) is the ONLY place FNV units meet engine units.

---

## 6. HONEST v0.1 SIMPLIFICATIONS (known debt, not secrets)

- Loot roll: deterministic 1–3-candidate sample vs chance-none — NOT FNV's
  pick-one-level-gated-entry semantics
- Flat heals (stimpak +30, food +5) — no over-time effects, no chems
- Dropped items vanish from the world (state correct; no prop respawn yet)
- Player position is frontend-reported, not runtime truth
- Knowledge gate passes everything
- Interior walls lost (perimeter blockout from tile adjacency; NIF meshes unparsed)
- Authority gate: player-only


