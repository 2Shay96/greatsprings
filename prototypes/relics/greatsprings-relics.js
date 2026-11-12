/* =============================================================================
 * GREATSPRINGS — RELIC QUESTS  (procedural side-quest engine, v0.1)
 * -----------------------------------------------------------------------------
 * Builds on greatsprings-core.js. Turns "implied gibberish" into real systems:
 *
 *   [set_weather.to.calm]            -> Weather.set('calm')
 *   [set_NPC.state.to.relaxed]       -> NPC.setState(id,'relaxed')
 *   NPC.Doc.reset.memory             -> NPC.forget(id, tag)   (scoped, transient only)
 *   routine.sunnysmiles.docshome     -> defineNPC(... routine, home ...)
 *   goodsprings.item.cost.-10%       -> Faction.grantPerk('goodsprings',{vendorMult:0.9})
 *   DocMitchell.Kitchen.status=...   -> Space.setStatus('space.kitchen','immaculate')
 *
 * The centrepiece is the RELIC QUEST pipeline: the engine assembles a context
 * payload from world + NPC + player state; the DM (one LLM call) PROPOSES
 * candidate quests as structured JSON; the engine VALIDATES them against the
 * coordinate bounds, the giver's plausibility, a power cap and a cooldown; one
 * is issued; success stamps a playthrough-unique RELIC onto the run.
 *
 * Think Slay-the-Spire relics, but earned through circumstance instead of drops:
 * shoot a rat with Sunny on day 1 and you carry Guns+5 for the whole run.
 * ===========================================================================*/
"use strict";
const GS = require("./greatsprings-core.js");
const { define, resolve, whenDefined, on, emit, DEV, isStub } = GS;

/* =====================  WORLD + WEATHER  ================================= */
const WORLD = { day:1, minute:9*60+34, weather:"calm", sky:"clear", hazard:null,
  origin:[0,0,0],                                  // house NW corner = world (0,0,0), metres
  bounds:{ min:[-10,-10,0], max:[19,16,8] } };     // the playable coordinate box (house + desert)
const Weather = {
  set(weather, sky){ WORLD.weather=weather; if(sky) WORLD.sky=sky; emit("weather.changed",{weather,sky:WORLD.sky}); return WORLD; },
  hazard(kind, ratePerSec){ WORLD.hazard = kind ? { kind, ratePerSec:ratePerSec||0 } : null; emit("weather.hazard",{hazard:WORLD.hazard}); return WORLD; },
  clear(){ WORLD.hazard=null; return this.set("calm","clear"); }
};
const fmtTime = () => `DAY ${WORLD.day} ${String(Math.floor(WORLD.minute/60)).padStart(2,"0")}:${String(WORLD.minute%60).padStart(2,"0")}`;

/* =====================  NPCs (state · regard · memory · routine)  ======== */
function defineNPC(id, data){
  return define("npc", id, Object.assign({
    id, name:"NPC", state:"neutral", regard:50, attractedTo:null, faction:null,
    home:null, routine:null, offers:[],                 // what quests this NPC can plausibly give
    memory:{ durable:[], transient:[] }
  }, data));
}
const NPC = {
  get:(id)=>resolve("npc",id),
  setState(id,state){ const n=NPC.get(id); if(isStub(n))return null; const prev=n.state; n.state=state; emit("npc.state",{id,prev,state}); return n; },
  adjustRegard(id,delta){ const n=NPC.get(id); if(isStub(n))return null; n.regard=Math.max(0,Math.min(100,n.regard+(delta|0))); return n.regard; },
  remember(id,tag,note,{durable=false}={}){ const n=NPC.get(id); if(isStub(n))return; (durable?n.memory.durable:n.memory.transient).push({tag,note,day:WORLD.day}); },
  /* scoped forget: clears a TRANSIENT memory only. Durable memories are never
     wiped this way — total amnesia is a footgun, so the API won't do it. */
  forget(id,tag){ const n=NPC.get(id); if(isStub(n))return; n.memory.transient = n.memory.transient.filter(m=>m.tag!==tag); }
};

/* =====================  SPACES (3D coords) + FACTIONS  =================== */
/* Give a space a real-world box and a mutable status the DM can read/narrate. */
function placeSpace(id, name, origin3d, size3d, extra={}){
  return define("space", id, Object.assign({ id, name, origin3d, size3d, status:"normal", labels:[] }, extra));
}
const Space = {
  setStatus(id,status){ const s=resolve("space",id); if(isStub(s))return; const prev=s.status; s.status=status; emit("space.status",{id,prev,status}); return s; }
};
const FACTION = {};
const Faction = {
  get:(id)=> FACTION[id] || (FACTION[id]={ id, standing:0, perks:[] }),
  grantPerk(id, perk){ const f=this.get(id); f.perks.push(perk); emit("faction.perk",{id,perk}); return f; },
  adjust(id,delta){ const f=this.get(id); f.standing+=delta|0; return f.standing; }
};

/* =====================  PLAYER (quest reads/writes this)  ================
 * In the full build this merges with the core CHAR + combat engine; kept local
 * so the demo runs standalone. */
const PLAYER = {
  name:"Lucie", level:2, xp:120, xpToNext:200,
  skills:{ Guns:18, Sneak:25, Speech:40, Survival:15, Repair:15, Medicine:20 },
  inventory:{ stimpak:2 }, conditions:[], relics:[]
};

/* =====================  RELICS  ========================================= */
/* A relic is a playthrough-unique buff. apply() mutates PLAYER; it is scarce by
 * design (the quest cooldown is what makes it rare). */
function defineRelic(id, rec){ return define("relic", id, Object.assign({ id, name:id, desc:"" }, rec)); }
function grantRelic(id){
  const r=resolve("relic",id); if(isStub(r)) return false;
  if(PLAYER.relics.find(x=>x.id===id)) return false;          // unique per run
  PLAYER.relics.push({ id, name:r.name });
  if(typeof r.apply==="function") r.apply(PLAYER);
  emit("relic.granted",{id});
  return true;
}

/* =====================  RELIC QUEST PIPELINE  ===========================
 * cooldown -> gather context -> DM proposes -> validate -> issue -> resolve. */
const RELIC_RULES = {
  cooldownDays: 7,          // at most one relic quest per 7 in-game days
  maxStatBuff: 5,           // power cap: a single relic may not exceed +5 to a skill
  maxRewardXp: 120          // power cap on bonus XP
};
const RelicQuests = {
  _lastIssuedDay: -999, _issued: [], active: null,
  status(){
    const since = WORLD.day - this._lastIssuedDay;
    if(this.active) return { allowed:false, reason:"a relic quest is already active", active:this.active.id };
    if(since < RELIC_RULES.cooldownDays) return { allowed:false, reason:`on cooldown (${RELIC_RULES.cooldownDays-since}d left)`, nextEligibleDay:this._lastIssuedDay+RELIC_RULES.cooldownDays };
    return { allowed:true };
  },

  /* (1) Everything the DM needs to invent a *grounded* quest — and nothing it
     can hallucinate around. This object is what one LLM call receives. */
  gatherContext(giverId, locationId){
    const g = NPC.get(giverId), loc = resolve("space",locationId);
    const exteriorSpots = Object.values(GS.REGISTRY.questspot || {}).map(s=>({ id:s.id, name:s.name, coords:s.coords, kind:s.kind }));
    return {
      giver: { id:g.id, name:g.name, state:g.state, regard:g.regard, attractedTo:g.attractedTo, offers:g.offers },
      player: { name:PLAYER.name, level:PLAYER.level, skills:PLAYER.skills, conditions:PLAYER.conditions.slice() },
      location: { id:loc.id, name:loc.name, status:loc.status },
      world: { time:fmtTime(), weather:WORLD.weather, sky:WORLD.sky, hazard:WORLD.hazard },
      bounds: WORLD.bounds,                       // quests MUST resolve inside this box
      questSpots: exteriorSpots,                  // real, coordinate-anchored targets
      relicWindow: this.status()                  // can a relic even be issued right now?
    };
  },

  /* (2) THE LLM SEAT. In production this is ONE call: the context above goes in,
     this exact JSON array comes back. Here a deterministic stand-in generates
     plausible candidates from the same context so the pipeline is reproducible
     and testable. Note it deliberately includes a couple of "reach" ideas so you
     can watch the guardrails do their job. */
  propose(ctx){
    const cands = [];
    const inBounds = ctx.world.weather==="calm";   // a friendly only sends you outside in fair weather
    // giver-appropriate: Sunny offers marksmanship/varmint work
    if(ctx.giver.offers.includes("marksmanship") && inBounds){
      cands.push({ id:"q_rat",  giver:ctx.giver.id, title:"A Steady Hand",
        premise:`${ctx.giver.name} offers to teach you to shoot on a radroach by the porch.`,
        objective:{ verb:"shoot", target:"radroach", spot:"spot_porch" },
        reward:{ xp:60, regard:8, relic:"relic.steady_hand", faction:["goodsprings",6] } });
      cands.push({ id:"q_cans", giver:ctx.giver.id, title:"Tin Can Alley",
        premise:`${ctx.giver.name} lines up bottles on the fence for target practice.`,
        objective:{ verb:"shoot", target:"bottles", spot:"spot_fence" },
        reward:{ xp:40, regard:5, relic:"relic.true_aim" } });
    }
    // a chore — plausible, but it's DOC's to give, not Sunny's (validator will flag)
    cands.push({ id:"q_dishes", giver:ctx.giver.id, title:"Doing the Dishes",
      premise:"Clean Doc's kitchen as thanks for the patch-up.",
      objective:{ verb:"clean", target:"kitchen", spot:"space.kitchen" },
      reward:{ xp:30, regard:6, contextChange:["space.kitchen","immaculate"], faction:["goodsprings",4] } });
    // out-of-range fetch (coords beyond bounds) — validator should clamp or cut
    cands.push({ id:"q_caravan", giver:ctx.giver.id, title:"The Lost Caravan",
      premise:"Recover medical supplies from a wrecked caravan out east.",
      objective:{ verb:"fetch", target:"supplies", spot:"spot_caravan_far" },
      reward:{ xp:90, regard:10, relic:"relic.scavenger" } });
    // too powerful for a day-1 friendly visit — validator should reject
    cands.push({ id:"q_deathclaw", giver:ctx.giver.id, title:"Claw & Order",
      premise:"Slay the deathclaw nesting past the water tower for its hide.",
      objective:{ verb:"kill", target:"deathclaw", spot:"spot_nest" },
      reward:{ xp:400, regard:20, relic:"relic.deathclaw_gauntlet" } });
    // physically impossible / off-world — the canonical reject
    cands.push({ id:"q_moon", giver:ctx.giver.id, title:"Fly Me to the Moon",
      premise:"Travel to the moon and plant a flag for Sunny.",
      objective:{ verb:"travel", target:"moon", spot:null, offworld:true },
      reward:{ xp:1000, relic:"relic.moonwalker" } });
    return cands;
  },

  /* (3) The engine referees every proposal. Cheap, deterministic rules — NOT a
     second model. Returns a verdict the demo can print. */
  validate(c, ctx){
    // a) spatial: must resolve to a real spot inside the coordinate bounds
    if(c.objective.offworld || c.objective.spot===null)
      return { verdict:"REJECT", reason:"objective is off-world / has no coordinates — outside the playable bounds" };
    const R = GS.REGISTRY;
    const spot = (R.questspot && R.questspot[c.objective.spot]) || (R.space && R.space[c.objective.spot]) || null;
    if(!spot) return { verdict:"REJECT", reason:`unknown location '${c.objective.spot}'` };
    const co = spot.coords || (spot.origin3d ? spot.origin3d : null);
    if(co){
      const b=ctx.bounds, within = co.every((v,i)=> v>=b.min[i] && v<=b.max[i]);
      if(!within) return { verdict:"REJECT", reason:`target at [${co}] is outside playable bounds — cut (no fast-travel content built out there)` };
    }
    // b) plausibility: can THIS giver, in THIS state, plausibly ask this?
    if(c.objective.verb==="clean" && !ctx.giver.offers.includes("chores"))
      return { verdict:"MODIFY", reason:`${ctx.giver.name} wouldn't assign Doc's chores — reframe as her nudging you to thank Doc yourself`, patch:{ giver:"npc.doc", note:"reassigned to the chore's rightful owner" } };
    if(c.objective.verb==="kill" && c.reward.xp > 200)
      return { verdict:"REJECT", reason:"lethal hunt far exceeds a friendly day-1 visit — wrong tone for the giver/state" };
    // c) power cap
    const relic = c.reward.relic ? resolve("relic", c.reward.relic, { fallback:null }) : null;
    if(relic && relic.power && relic.power > RELIC_RULES.maxStatBuff)
      return { verdict:"REJECT", reason:`relic grants +${relic.power} (> cap +${RELIC_RULES.maxStatBuff}) — too strong for an emergent quest` };
    if((c.reward.xp||0) > RELIC_RULES.maxRewardXp)
      return { verdict:"MODIFY", reason:`XP ${c.reward.xp} over cap ${RELIC_RULES.maxRewardXp} — clamped`, patch:{ xp:RELIC_RULES.maxRewardXp } };
    // d) cooldown
    if(!ctx.relicWindow.allowed)
      return { verdict:"REJECT", reason:`relic window closed: ${ctx.relicWindow.reason}` };
    return { verdict:"ACCEPT", reason:"grounded, plausible, within power and cooldown" };
  },

  /* run propose -> validate -> pick the best ACCEPTED candidate */
  generate(giverId, locationId){
    const ctx = this.gatherContext(giverId, locationId);
    const raw = this.propose(ctx);
    const judged = raw.map(c => ({ c, v:this.validate(c, ctx) }));
    const accepted = judged.filter(j => j.v.verdict==="ACCEPT").map(j => j.c);
    // prefer the candidate whose relic is the richest within cap (the keeper)
    const pick = accepted.sort((a,b)=> (b.reward.xp||0)-(a.reward.xp||0))[0] || null;
    return { ctx, judged, pick };
  },

  issue(quest){ this.active = quest; return quest; },

  /* (4) Apply outcomes. Success stamps the relic + side-effects onto the run. */
  resolve(quest, success){
    const out = { applied:[] };
    if(success){
      const r = quest.reward;
      if(r.xp){ PLAYER.xp += r.xp; out.applied.push(`+${r.xp} XP (now ${PLAYER.xp})`); }
      if(r.regard){ const v=NPC.adjustRegard(quest.giver, r.regard); out.applied.push(`${quest.giver} Regard +${r.regard} (now ${v})`); }
      if(r.relic){ const before=JSON.stringify(PLAYER.skills); grantRelic(r.relic); out.applied.push(`RELIC granted: ${resolve("relic",r.relic).name}`); if(JSON.stringify(PLAYER.skills)!==before) out.applied.push(`  ↳ skills now ${Object.entries(PLAYER.skills).map(([k,v])=>k+v).join(" ")}`); }
      if(r.faction){ Faction.adjust(r.faction[0], r.faction[1]); out.applied.push(`${r.faction[0]} standing +${r.faction[1]}`); }
      if(r.contextChange){ Space.setStatus(r.contextChange[0], r.contextChange[1]); out.applied.push(`world state: ${r.contextChange[0]} → ${r.contextChange[1]} (DM will narrate it)`); }
      this._lastIssuedDay = WORLD.day; this._issued.push(quest.id);
    } else {
      NPC.adjustRegard(quest.giver, -2);
      out.applied.push(`${quest.giver} Regard -2 (let them down)`);
      this._lastIssuedDay = WORLD.day;                 // failure still spends the window
    }
    this.active = null;
    return out;
  }
};

module.exports = { GS, WORLD, Weather, NPC, Space, Faction, PLAYER, RelicQuests, defineNPC, placeSpace, defineRelic, grantRelic };

/* =============================================================================
 * DEMO  —  node greatsprings-relics.js
 * ===========================================================================*/
if (require.main === module) {
  const line = (s="") => console.log(s);
  line("══════════ GREATSPRINGS — RELIC QUESTS · live pipeline ══════════\n");

  /* ---- 0. the residents exist before we touch them ---- */
  defineNPC("npc.doc", { name:"Doc Mitchell", faction:"goodsprings", offers:["chores","medicine"], home:"space.clinic" });

  /* ---- A. the radstorm passes; restore the status quo ---- */
  Weather.hazard("radstorm", 1.0);                 // (was active)
  NPC.setState("npc.doc","alarmed"); NPC.remember("npc.doc","event.radstorm","told Lucie to shelter");
  Weather.clear();                                  // [set_weather.to.calm]
  NPC.setState("npc.doc","relaxed");                // [set_NPC.state.to.relaxed]
  NPC.forget("npc.doc","event.radstorm");           // NPC.Doc.reset.memory (scoped, transient)
  const doc = NPC.get("npc.doc");
  line("A) STATUS QUO RESTORED");
  line(`   weather: ${WORLD.weather}/${WORLD.sky}, hazard: ${WORLD.hazard}`);
  line(`   Doc.state: ${doc.state} · transient memory of storm: ${doc.memory.transient.filter(m=>m.tag==="event.radstorm").length? "still there":"cleared"}\n`);

  /* ---- B. give the house real coordinates + a desert around it ---- */
  placeSpace("space.clinic","Clinic",[5,0,0],[4,4,3]);
  placeSpace("space.kitchen","Kitchen",[2.2,5.8,0],[2.8,4,3]);
  placeSpace("space.bedroom","Doc's Bedroom",[7,5.8,0],[2,4,3]);
  define("region","region.house",  { id:"region.house",  bounds:{ min:[0,0,0], max:[9,6,3] } });
  define("region","region.desert", { id:"region.desert", bounds:WORLD.bounds, terrain:"sand", note:"blank desert plot wrapping the house" });
  // coordinate-anchored exterior targets the DM may use
  const spot=(id,name,coords,kind)=>define("questspot",id,{id,name,coords,kind});
  spot("spot_porch","the porch",[4.5,-2,0],"yard");
  spot("spot_fence","the fence line",[12,8,0],"yard");
  spot("spot_caravan_far","wrecked caravan (east)",[40,-30,0],"offmap");   // OUT of bounds on purpose
  spot("spot_nest","deathclaw nest",[10,12,0],"yard");
  line("B) WORLD COORDINATES");
  line(`   house region [0,0,0]–[9,6,3] m · playable bounds [${WORLD.bounds.min}]–[${WORLD.bounds.max}] m (house + ~desert)`);
  line(`   exterior quest spots: ${Object.values(GS.REGISTRY.questspot).map(s=>s.name+"["+s.coords+"]").join(", ")}\n`);

  /* ---- C. Sunny Smiles, visiting ---- */
  defineNPC("npc.sunny_smiles", {
    name:"Sunny Smiles", state:"relaxed", regard:50, attractedTo:"any", faction:"goodsprings",
    offers:["marksmanship","survival","varmint_control"],
    home:"prospector_saloon",
    routine:{ reason:"dropped by to check on Doc's patient and borrow ammo", staysUntil:"DAY 1 13:00", location:"space.clinic" }
  });
  // relics this run can mint
  defineRelic("relic.steady_hand", { name:"Steady Hand", power:5, desc:"Sunny's first lesson sticks. Guns +5 for the whole run.", apply:p=>{ p.skills.Guns+=5; } });
  defineRelic("relic.true_aim",    { name:"True Aim",    power:3, desc:"Guns +3.", apply:p=>{ p.skills.Guns+=3; } });
  defineRelic("relic.scavenger",   { name:"Scavenger",  power:0, desc:"(unbuilt effect)" });
  // relic.deathclaw_gauntlet / relic.moonwalker intentionally undefined → backlog
  const sunny=NPC.get("npc.sunny_smiles");
  line("C) SUNNY SMILES ADDED");
  line(`   ${sunny.name} — state ${sunny.state}, Regard ${sunny.regard}, attractedTo ${sunny.attractedTo}, offers [${sunny.offers}]`);
  line(`   why she's here: "${sunny.routine.reason}" (until ${sunny.routine.staysUntil})\n`);

  /* ---- D. the Relic Quest pipeline, in full view ---- */
  line("D) RELIC QUEST PIPELINE  ▸ giver = Sunny, location = clinic\n");
  const { ctx, judged, pick } = RelicQuests.generate("npc.sunny_smiles","space.clinic");

  line("   [1] CONTEXT the engine feeds the DM (one LLM call gets exactly this):");
  line("       giver="+JSON.stringify(ctx.giver));
  line("       world="+JSON.stringify(ctx.world)+"  relicWindow="+JSON.stringify(ctx.relicWindow));
  line("       bounds="+JSON.stringify(ctx.bounds)+"\n");

  line("   [2] DM PROPOSED  (LLM seat → these candidates):");
  judged.forEach(j=> line(`       • ${j.c.title.padEnd(18)} ${j.c.objective.verb} ${j.c.objective.target}  → reward ${JSON.stringify(j.c.reward)}`));
  line("");

  line("   [3] ENGINE VALIDATION  (deterministic referee):");
  judged.forEach(j=>{
    const tag = j.v.verdict==="ACCEPT"?"✓ ACCEPT":j.v.verdict==="MODIFY"?"~ MODIFY":"✗ REJECT";
    line(`       ${tag}  ${j.c.title.padEnd(18)} — ${j.v.reason}`);
  });
  line("");

  line("   [4] SELECTED QUEST:");
  if(pick){ line(`       "${pick.title}" — ${pick.premise}`); line(`       objective: ${pick.objective.verb} the ${pick.objective.target} at ${resolve("questspot",pick.objective.spot).name}`); }
  RelicQuests.issue(pick);
  line("");

  line("   [5] OUTCOME ▸ player shoots the radroach (SUCCESS):");
  line(`       Guns before: ${PLAYER.skills.Guns}`);
  const res = RelicQuests.resolve(pick, true);
  res.applied.forEach(a=> line("       "+a));
  line(`       Sunny gift / relic now in run: [${PLAYER.relics.map(r=>r.name).join(", ")}]`);
  line(`       goodsprings perk check → (none granted yet; standing ${Faction.get("goodsprings").standing})\n`);

  /* ---- E. the cap protects the engine ---- */
  line("E) COOLDOWN ▸ try to mint a second relic the same day:");
  const again = RelicQuests.generate("npc.sunny_smiles","space.clinic");
  const why = again.judged.find(j=>j.v.verdict!=="ACCEPT" && /cooldown|window/.test(j.v.reason));
  line(`       status: ${JSON.stringify(RelicQuests.status())}`);
  line(`       → every candidate now bounces: "${(why?why.v.reason:"blocked")}"`);
  line(`       (one relic per ${RELIC_RULES.cooldownDays} in-game days — speedrunners get ONE early edge, not ten)\n`);

  DEV.report();
}
