// Recovery adapter, November 2026. Implements the services used by the archived
// Relic demo. The original greatsprings-core.js has not been recovered.
"use strict";
const { EventEmitter } = require("node:events");
const events = new EventEmitter();
const REGISTRY = Object.create(null);
const missing = new Set();
const stubs = new WeakSet();

function define(kind, id, record) {
  REGISTRY[kind] ??= Object.create(null);
  REGISTRY[kind][id] = record;
  missing.delete(id);
  return record;
}

function resolve(kind, id, options = {}) {
  if (Object.hasOwn(REGISTRY[kind] ?? {}, id)) return REGISTRY[kind][id];
  missing.add(id);
  if (Object.hasOwn(options, "fallback")) return options.fallback;
  const stub = { id };
  stubs.add(stub);
  return stub;
}

module.exports = {
  REGISTRY, define, resolve,
  emit: events.emit.bind(events),
  isStub: record => stubs.has(record),
  DEV: { report() { console.log("Unresolved records:", [...missing].join(", ") || "none"); } }
};
