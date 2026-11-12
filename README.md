# Greatsprings · RobCo Framework

**Paused work in progress by 2Shay (Nexus) / 2Shay96 (GitHub).**

## The RPG I wanted to play

**What should happen the morning after Goodsprings disappears?**

> The ai dungeon master ties up any loose ends, and decides how friends of the NPCs that no longer exist in NV take it - what do they say to the player to show they recognise Goodsprings destruction? Does a NPC randomly make a journey to the shellhole left there, and leave a flower o the ground in remembrance? this is what Semantic Engine can let happen - those little stories that stack into a most unique and beautiful playthrough

— 2Shay

## Design goals

I wanted to build Semantic Engine, an original C++ RPG engine that gives players a reason to return to the same world. An AI dungeon master would follow the choices each player makes and build stories from their consequences. My goal was for every choice to get a believable response, even one the quest writer never anticipated.

I designed RobCo Framework as a proof-of-concept fork of Semantic Engine, using *Fallout: New Vegas* as the testbed. The dungeon master would draw on what characters know, whom they care about, and what has changed around them to propose new missions and choices. Deterministic engine checks would establish whether each proposal could actually happen. A friend might want to leave a flower at Goodsprings, but first they need to hear the news and have a way to get there.

Greatsprings preserves a C# runtime, a Godot frontend, JavaScript experiments, and a Python record extractor.
The surviving importer reads game records into JSON. A C++ backend remains a design goal.

## Start here · play a Relic quest

Relic quests are the central idea: a lasting reward tied to something particular to your playthrough.
Run the recovered Sunny Smiles encounter with Node.js 18 or later:

```sh
node prototypes/relics/greatsprings-relics.js
```

Sunny visits Doc’s clinic on a calm morning. She can plausibly offer the player a shooting lesson.
The demo judges six proposals against the giver, reachable locations, reward limits, and quest availability.
It flags Doc’s kitchen chore for reassignment and rejects the caravan beyond the playable area.
Completing Sunny’s lesson grants *Steady Hand*, raises Guns from 18 to 23, and starts a seven-day cooldown.

The recovered module generates scripted proposals. A new compatibility file supplies its missing registry and events.
The intended AI dungeon master could run locally or online and reason through alternative quests.
This demo exercises the engine’s checks without connecting to a model.

Browse the [prototype and design collection](docs/collection.md) for the other surviving experiments.

## What survived

| Component | What you can try |
| --- | --- |
| JavaScript prototypes | Run scripted character encounters. Compare the final world hash against replaying the event log. |
| RobCo runtime | Attempt actions, reject impossible commands, loot containers, equip items, and replay a saved history. |
| Godot 4.7 .NET frontend | Walk through a greybox of Doc Mitchell’s house using a local scene export. |
| Python extractor | Read mechanical records, object placements, and model paths from your own FalloutNV.esm. |

## Run the standalone prototypes

From the repository root, with Node.js installed:

```sh
node prototypes/robco-engine.js
node prototypes/robco-testbed.js
```

Both print live and replayed state hashes. Proposals in these demonstrations are scripted.

## Run the recovered Greatsprings scene

The historical scene fixture contains exported game data. Supply your local Greatsprings export:

```sh
mkdir -p robco-godot/data
cp /path/to/your/scene.json robco-godot/data/scene.json
dotnet run --project robco-runtime-tests -- robco-godot/data/scene.json
```

Open `robco-godot/project.godot` in Godot 4.7 .NET, build, then press F5.
WASD moves, E interacts, and Tab opens inventory. During play, F5 saves and F9 replays.
The 32 original checks use Doc Mitchell’s house, including its items, containers, and occupants.

To inspect records from your own installation:

```sh
python3 tools/extract_esm_merged_v4.py /path/to/FalloutNV.esm full_extract.json
```

This produces an intermediate export. The conversion from that export to the demo fixture remains unrecovered.

## Semantic Viewer

Grizzly7 was the test for describing a modded item from its appearance.
The [viewer recovery note](docs/semantic-viewer.md) explains the seven views, proposed tags, and NPC reactions.

The original [runtime architecture](docs/robco-runtime-architecture-v0.1.md) records the contemporary design.
