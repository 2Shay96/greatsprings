# 02 Docs
# RobCo Framework Roadmap
Version: v0.1

Status: Vision Document

Author: Seamus

---

# Purpose

This document outlines the long-term vision for the RobCo Framework project, beginning as a faithful recreation of Fallout: New Vegas' Goodsprings before evolving into a general-purpose, AI-native RPG framework capable of powering entirely new worlds.

This is **not** an implementation document.

It exists to ensure future development remains focused on building reusable systems rather than isolated gameplay features.

---

# Philosophy

The project follows one simple principle:

> Build reusable simulation systems, not game-specific mechanics.

Everything added to RobCo should ideally become another building block that future games can inherit.

---

# Development Roadmap

## Phase 1 — Goodsprings Rebuilt

Objective:

Create a deterministic, 1:1 recreation of Fallout New Vegas's Goodsprings inside Godot using C#.

This phase intentionally avoids improving gameplay.

The objective is simply to prove that every important Gamebryo behaviour can be reproduced cleanly inside a modern runtime.

Questions this phase should answer:

- Can Gamebryo data be imported deterministically?
- Can NPC schedules be faithfully recreated?
- Can AI understand the project architecture?
- Is the runtime architecture simple enough for novice programmers?
- Can save/load remain deterministic?
- Are ownership and interaction systems flexible enough for future expansion?

This project becomes the reference implementation for RobCo Framework.

---

## Phase 2 — RobCo Framework

Once Goodsprings exists, reusable systems are extracted into the RobCo Framework.

RobCo is not a Fallout engine.

It is a simulation framework inspired by Fallout's design.

Core goals:

- Greppable architecture
- Semantic naming
- Elegant C#
- AI-friendly codebase
- Socket-based ownership
- Runtime composability
- Deterministic simulation

Every system should exist because multiple games could reuse it.

---

## Phase 3 — Greatsprings

Greatsprings is not a remake.

It is the answer to the question:

"What if Fallout New Vegas had no Gamebryo limitations?"

Examples include:

- Continuous interiors (no loading cells)
- Fully enterable vehicles
- Rich NPC schedules
- Immersive Sim gameplay
- AI-assisted dialogue
- AI Dungeon Master narration
- Advanced medical systems
- Dynamic world simulation
- Expanded mature themes where appropriate
- Physical object persistence

Greatsprings exists to prove the capabilities of RobCo Framework.

---

## Phase 4 — Semantic Engine

RobCo eventually sheds its Fallout heritage.

The result is a completely engine-agnostic simulation framework capable of generating entirely new RPG worlds.

Potential capabilities:

- Import real-world terrain
- Generate playable settlements
- Simulate living NPC populations
- Understand imported assets semantically
- Build gameplay systems through AI-assisted tooling
- Modular runtime architecture
- Engine-independent simulation

The goal becomes:

> Make building an RPG as accessible as writing a document.

---

# Design Philosophy

Rather than hard-coding gameplay mechanics, RobCo should expose reusable interaction modules.

Instead of building:

- Lockpicking
- Surgery
- Generator Repair
- Safe Cracking

The framework should provide generic interaction systems.

Examples:

## Precision Manipulation

Can represent:

- Lockpicking
- Surgery
- Electronics repair
- Bomb disposal
- Gunsmithing

Each game simply changes presentation, tools and consequences.

---

## Social Negotiation

Can represent:

- Persuasion
- Intimidation
- Bartering
- Romance
- Interrogation
- Diplomacy

---

## Mechanical Assembly

Can represent:

- Repairing generators
- Crafting weapons
- Vehicle maintenance
- Robotics

---

## Pattern Recognition

Can represent:

- Hacking
- Code breaking
- Ancient puzzles
- Signal decoding

---

## Resource Management

Can represent:

- Medical triage
- Chemistry
- Cooking
- Reactor management

---

# Example System Proposal

## Medical Trauma

Rather than instant healing through consumables, injuries become interactive.

Example:

Player is shot.

Instead of immediately using a Stimpak:

- Bleeding begins.
- Blood volume decreases over time.
- Shock increases.
- Pain affects movement.
- Shrapnel may remain inside the wound.

The player must:

- Inspect wound
- Control bleeding
- Remove foreign object
- Bandage correctly
- Decide whether immediate field treatment is sufficient

Randomised wound layouts prevent the interaction from becoming completely memorised.

The goal is tension rather than complexity.

This same interaction module could also support:

- Removing arrows
- Extracting parasites
- Robot repairs
- Veterinary medicine
- Cybernetic surgery

---

# Translation Layers

Future tooling should understand assets semantically instead of simply copying files.

Example pipeline:

External Game Assets

↓

Importer

↓

Semantic Analysis

↓

Weapon

Vehicle

NPC

Animation

Quest

Material

Container

Building

↓

RobCo Runtime

The importer determines how imported content should behave rather than merely reproducing it.

---

# AI Integration

AI should augment the framework rather than replace it.

Responsibilities suitable for AI:

- Dialogue generation
- Quest generation
- Voice synthesis
- Behaviour suggestions
- Asset analysis
- Missing metadata inference
- Design assistance

Responsibilities unsuitable for AI:

- Deterministic simulation
- Save games
- Physics
- Combat calculations
- Ownership
- Runtime architecture

The deterministic simulation remains authoritative.

AI provides flavour and creativity.

---

# Long-Term Vision

Eventually, RobCo evolves beyond Fallout.

Imagine:

A user imports satellite imagery of their local village.

The engine:

- Generates terrain.
- Creates roads.
- Identifies buildings.
- Creates navigation meshes.
- Simulates daily life.
- Allows custom NPC personalities.
- Generates believable schedules.
- Supports AI-generated dialogue.
- Produces a fully playable RPG sandbox.

No advanced programming knowledge required.

---

# Guiding Principles

Every feature should satisfy three questions before entering RobCo.

## 1. Reusable

Can multiple games benefit from this system?

---

## 2. Composable

Can this plug cleanly into existing runtime systems?

---

## 3. Deterministic

Can the simulation remain predictable while AI enhances presentation?

---

If the answer to all three is "yes", it belongs in RobCo Framework.

Otherwise, it belongs in an individual game built upon the framework.

---

# Final Goal

The ultimate objective is not simply to recreate Fallout.

The goal is to create an open-source, AI-native simulation framework that enables anyone to build deep, systemic RPGs with reusable mechanics, understandable architecture, and modern tooling.

Goodsprings Rebuilt proves the concept.

RobCo Framework provides the foundation.

Greatsprings demonstrates the possibilities.

The Semantic Engine makes those possibilities available to everyone.
