# Greatsprings · RobCo Framework

**Paused work in progress by 2Shay (Nexus) / 2Shay96 (GitHub).**

## The RPG I wanted to play

What happens to a delivery quest if the player destroys Goodsprings before accepting it?
The town should disappear as a destination. A surviving courier might know where the refugees went.
A stranger across the map should learn about it through someone who witnessed it.

My ambition for Semantic Engine was an original C++ RPG engine supporting choices beyond scripted branches.
AI would propose consequences and dialogue. The engine would check each proposal against persistent world facts.
Modders could author people, places, and motives without scripting every possible meeting.

RobCo Framework explored that idea using Fallout: New Vegas as a test case.
Greatsprings preserves a C# runtime, a Godot frontend, JavaScript experiments, and a Python record extractor.
The surviving importer reads game records into JSON. A C++ backend remains a design goal.

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

I wanted NPCs to notice the weapon someone actually carried, including unfamiliar Fallout 4 modded weapons.
The viewer would inspect a 3D model from several angles and record visible traits.
An NPC could then describe a gold finish or Gothic ornament without knowing the mod’s name.

Design example: a collector might gain five coolness points for carrying several gilded weapons.
Matching Gothic clothing could earn twenty suave points. Clashing clothes might incur a small penalty.
Those numbers illustrate possible game rules. The recovered runtime does not implement those scores.

A July backup preserves a VLM importer demo image and notes on appearance reactions.
Standalone viewer source remains unlocated. Open-ended AI consequences also remain an ambition.

The original [runtime architecture](docs/robco-runtime-architecture-v0.1.md) records the contemporary design.
