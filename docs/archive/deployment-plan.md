A Semantic Runtime or Semantic Simulation Runtime.

⸻

RobCo Framework

Deployment Plan v0.1

Author: Shay

Status: Design Proposal

Version: 0.1

⸻

Overview

RobCo Framework is the Fallout: New Vegas implementation of a larger game technology created by Shay.

For intellectual property reasons, RobCo Framework is presented strictly as a Fallout: New Vegas mod, despite internally being powered by a much larger engine architecture.

The underlying technology is currently referred to as the Semantic Engine (working title).

RobCo Framework should be viewed as one implementation (“flavour”) of the Semantic Engine.

Example future implementations:

* RobCo Framework (Fallout: New Vegas)
* Synth Framework (Fallout 4)
* Capital Framework (Fallout 3)
* Tamriel Framework (Skyrim)
* Liberty Framework (Oblivion)

The engine itself remains completely game-agnostic.

⸻

Semantic Engine

(working title)

The Semantic Engine is a game-independent simulation runtime designed around three principles:

* semantic data
* AI-assisted development
* highly accessible modding

Rather than reproducing another game’s original source code, the engine reconstructs the meaning and intent of game assets into a searchable, extensible simulation.

Its purpose is to preserve the behaviour, relationships and gameplay logic of an existing game while exposing that information in a form that is understandable by humans and AI agents alike.

⸻

Philosophy

The Semantic Engine is not intended to replace existing game engines.

Instead, it acts as a semantic runtime capable of recreating another game’s behaviour from its public game data.

Think of it as a semantic twin of an existing game.

Rather than copying implementation, it reconstructs intent.

⸻

Advantages

AI-friendly

Every asset has meaningful identifiers.

Instead of searching for obscure editor IDs:

WeapNVHuntingRifleUnique

developers can search naturally:

rifle
gun
sniper
military
bolt_action

AI agents can understand the project with little prior knowledge.

⸻

Highly Greppable

Everything uses descriptive semantic IDs.

Examples

weapon.hunting_rifle
npc.goodsprings.doc_mitchell
building.goodsprings.school
item.stimpak

Searching becomes intuitive.

grep gun

returns every firearm.

grep doctor

returns every doctor.

⸻

Reverse-Engineered Knowledge Base

Because every asset is reconstructed semantically, the project naturally becomes a searchable archive of Fallout’s mechanics.

The project doubles as documentation.

⸻

Game Preservation

Should the original engine ever become unavailable, the Semantic Engine preserves the gameplay concepts, mechanics and relationships in an understandable form.

It preserves the heart of the game rather than its original implementation.

⸻

Cross-Framework Compatibility

Because every Framework shares the same runtime:

* mechanics
* AI systems
* simulation code

can be transferred between Frameworks.

For example, an emergent settlement mechanic developed for Fallout 4 could be adapted for New Vegas with minimal effort.

⸻

Engine Portability

The runtime is intentionally portable.

Possible targets include:

* Godot
* Unreal Engine 5
* Unity
* C#
* native desktop applications

Because the simulation is engine-independent, multiple visualisations can exist simultaneously.

Examples:

* traditional first-person RPG
* isometric RPG
* 2D pixel-art adaptation
* server simulation
* web visualiser

⸻

Core Engine Principles

Graceful Incompleteness

The engine never assumes every mechanic has already been implemented.

Example:

Weapon.Menace = 10

If no system currently reads “Menace”, the engine does not fail.

Instead it logs:

Unimplemented mechanic detected:
Weapon.Menace
Referenced by:
weapon.hunting_rifle
No runtime system currently consumes this value.

Development can continue uninterrupted.

This allows mechanics to evolve organically.

⸻

Sandbox-First Design

The engine is fundamentally an immersive simulation.

Rules emerge from systems rather than scripts.

Every object exists because it participates in simulation.

⸻

AI-Native Architecture

The engine assumes AI is available.

Rather than bolting AI onto an existing game, AI is treated as another subsystem.

Examples include:

* narrated gameplay
* contextual NPC dialogue
* dynamic memory
* world reasoning
* procedural storytelling

⸻

Major Engine Modules

Context Holotapes

Persistent world memories stored as semantic documents.

NPCs, locations and systems can retrieve these memories as context before reasoning.

⸻

LLM Overseer

A high-level reasoning system responsible for proposing believable world changes.

Rather than directly modifying the world, it submits proposals.

Example:

Quest Proposal:
Goodsprings water shortage.
Reasoning:
NPC water reserves low.
Settlement morale declining.
Nearby NCR caravan available.

⸻

ZAX

The deterministic simulation authority.

ZAX evaluates Overseer proposals.

If consistent with simulation rules, changes are committed.

⸻

Mutated Quests

Traditional procedural quests usually select from templates.

Mutated Quests instead emerge from:

* NPC motivations
* settlement state
* world history
* player actions
* current simulation

The result is a quest appropriate to the current world rather than a predefined script.

⸻

AI Modules

Semantic Asset Analysis

AI examines assets and infers additional semantic properties.

Example:

Weapon:

Rusty Pipe Rifle

Possible inferred tags:

improvised
civilian
intimidation_low
maintenance_poor

Future applications include:

* buildings
* clothing
* creatures
* settlements
* environmental storytelling

⸻

Semantic Asset Reconstruction

Existing game records are reconstructed into semantic equivalents.

Example:

STAT: 00094A3F

becomes

prop.big_table

Everything receives meaningful names.

⸻

Interior-to-World Reconstruction

AI reconstructs disconnected interiors into one continuous world.

Example:

Doc Mitchell’s house becomes physically embedded inside Goodsprings.

Benefits:

* no loading screens
* seamless NPC navigation
* unified simulation space

⸻

Semantic Vision

The engine understands rendered images.

Possible applications include:

* photographs
* surveillance cameras
* paintings
* security terminals

NPCs can reason about visual evidence.

Example:

“That’s you.

This photograph is dated one year ago.

You had fewer scars.

You were wearing Powder Ganger clothing then.

You now resemble a Fiend.”

⸻

Long-Term Vision

The Semantic Engine aims to become a portable simulation runtime capable of reconstructing the intent of existing games into an accessible, searchable, AI-friendly format.

RobCo Framework is simply the first implementation.

Future Frameworks may target entirely different games while sharing the same underlying runtime, allowing mechanics, AI systems and simulation features to evolve independently of any single title.

⸻

Suggested naming improvements

I actually think some of your working names can be strengthened:

Current	Suggested	Reason
Somatic Engine	Semantic Engine	“Semantic” immediately communicates meaning-driven architecture. “Somatic” usually relates to the body.
Brother Engine	Semantic Runtime	More professional and technically accurate.
Cloner Engine	Twin Runtime	“Twin” implies faithful behaviour without implying code copying.
Flavor	Framework or Implementation	More common software terminology.
Branch	Framework	Keeps the naming consistent: RobCo Framework, Synth Framework, etc.

The overall architecture also becomes clearer if you think of it as:

Semantic Engine (core technology) → Framework (game-specific implementation) → Game (e.g. Fallout: New Vegas)

This hierarchy is technically cleaner, easier to explain to AI agents, and better distinguishes your original engine IP from the game-specific layer.