#!/usr/bin/env node
/* ============================================================================
 *  R O B C O   E N G I N E   —   Mk1 core (executable)
 *  Bud proposes. ZAX disposes. The organs simulate. The Vault remembers.
 *
 *  This file is the real thing, not a sketch. It runs:
 *    node robco-engine.js
 *  Claude acts as BUD (the Overseer) by hand-authoring the proposals below.
 *  Everything ZAX does is deterministic, model-free, and replay-safe.
 * ========================================================================== */

'use strict';
const C = { reset:'\x1b[0m', dim:'\x1b[2m', bud:'\x1b[35m', zax:'\x1b[36m', eng:'\x1b[33m',
  ok:'\x1b[32m', bad:'\x1b[31m', bone:'\x1b[37m', b:'\x1b[1m' };
const log = (s='')=>console.log(s);
const pad = (s,n)=>String(s).padEnd(n);

/* ============================================================================
 *  SPINE  —  deterministic state core: the one truth, the one door, seeded RNG
 * ========================================================================== */
function mulberry32(seed){ let a=seed>>>0; return ()=>{ a|=0; a=a+0x6D2B79F5|0;
  let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

const Spine = {
  rand(state){ state.rng.cursor++; return mulberry32(state.rng.seed + state.rng.cursor)(); },
  // THE ONE DOOR. Nothing changes the world except an effect passed through here.
  applyEffect(state, effect, source){
    const h = EFFECT_TYPES[effect.type];
    if(!h) throw new Error('unknown effect type: '+effect.type);
    h.apply(state, effect);
    state.vault.push({ turn: state.turn, effect, source });   // logged for replay
  },
  get(state, id){ return state.entities[id] || state.spaces[id] || null; }
};

/* ============================================================================
 *  EFFECT_TYPES  —  the manifest (the membrane's vocabulary).
 *  Every effect the world understands lives here: who may author it + handler.
 * ========================================================================== */
const EFFECT_TYPES = {
  regard_delta:    { author:['organ'],               apply:(s,e)=>{ (s.regard[e.from] ||= {}); s.regard[e.from][e.to] = (s.regard[e.from][e.to]||0) + e.amount; } },
  learn_fact:      { author:['organ'],               apply:(s,e)=>{ s.entities[e.who].knowledge.add(e.factId); (s.facts[e.factId] ||= {knownBy:new Set(),origin:e.via}).knownBy.add(e.who); } },
  need_delta:      { author:['organ','world_event'], apply:(s,e)=>{ const n=s.entities[e.who].needs; n[e.need]=Math.max(0,Math.min(100,(n[e.need]||0)+e.amount)); } },
  injure:          { author:['organ'],               apply:(s,e)=>{ const en=s.entities[e.who]; en.hp=Math.max(0,en.hp-e.amount); } },
  sever:           { author:['organ'],               apply:(s,e)=>{ const en=s.entities[e.who]; en.alive=false; en.conscious=false; } }, // kept, never deleted
  set_space_status:{ author:['organ','world_event'], apply:(s,e)=>{ s.spaces[e.space].status=e.status; } },
  canon_write:     { author:['organ','world_event'], apply:(s,e)=>{ s.canon.push({factId:e.factId, text:e.text, day:s.day}); (s.facts[e.factId] ||= {knownBy:new Set(),origin:'canon'}); } },
  utter:           { author:['organ'],               apply:(s,e)=>{ /* a line spoken; logged to the Vault, no state change */ } },
  economy_shock:   { author:['organ'],               apply:(s,e)=>{ s.economy.trade += e.delta; } }
};

/* ============================================================================
 *  RULES  —  tunable law ZAX applies (authority table, capabilities, dials)
 * ========================================================================== */
const RULES = {
  authorByVerb: {                 // LAW IV: who may author each verb
    say:['npc','player'], react:['npc'], give:['npc','player'], move:['npc','player'],
    attack:['npc','player'],      // an ATTEMPT — an organ rules on the result
    destroy:['player','world_event'],
    die:['world_event','organ'],  // death is NEVER narrated into being by an NPC
    spawn_quest:['overseer'],
    notice_visual:['npc','player']
  },
  capByVerb: { say:['speak'], move:['move'], give:['manipulate'], attack:['move'],
    notice_visual:['see'], react:[] },
  regardPosCap: 6, regardNegFloor: -15,   // anti-glaze: flattery can't buy more than +6 / turn
  IRRATIONAL_GAIN: 0.8,                    // LAW III feel-dial: how far desperation bends behaviour
  gossipReach: 0.7,                        // chance a fact crosses a strong bond
  absurd: [ /* a SHORT hand list, NOT a physics solver */ ]
};
const ACCEPTED_EVIDENCE = new Set(['witness','told','gossip','event','note','canon']);

/* ============================================================================
 *  HOLOTAPE  —  the authored world (Greatsprings, micro slice). Data, not code.
 * ========================================================================== */
function loadHolotape(){
  const E = (id,o)=>Object.assign({ id, kind:'npc', exists:true, alive:true, conscious:true, hp:100,
    location:'space.gs.saloon', capabilities:new Set(['see','hear','speak','move','manipulate']),
    knowledge:new Set(), personality:{care:.2,aggression:.2,greed:.2,caution:.3,destruction:.05}, needs:{} }, o);
  const entities = {
    'npc.gs.doc_mitchell': E('npc.gs.doc_mitchell',{ location:'space.gs.clinic', personality:{care:.9,aggression:.05,greed:.1,caution:.6,destruction:.05}, needs:{grief:15,fear:5} }),
    'npc.gs.trudy':        E('npc.gs.trudy',{ personality:{care:.5,aggression:.3,greed:.3,caution:.4,destruction:.05} }),
    'npc.gs.bonesaw':      E('npc.gs.bonesaw',{ location:'space.gs.road', personality:{care:.1,aggression:.8,greed:.5,caution:.2,destruction:.3}, needs:{hunger:60} }),
    'npc.gs.ringo':        E('npc.gs.ringo',{ personality:{care:.3,aggression:.2,greed:.4,caution:.7,destruction:.05}, needs:{fear:40} }),
    'npc.gs.joe_cobb':     E('npc.gs.joe_cobb',{ location:'space.gs.saloon', personality:{care:.05,aggression:.9,greed:.6,caution:.2,destruction:.5} }),
    'npc.gs.old_pete':     E('npc.gs.old_pete',{ capabilities:new Set(['hear','speak','move','manipulate']) /* BLIND: no 'see' */ }),
    'pc.courier':          E('pc.courier',{ kind:'player', location:'space.gs.road', personality:{} })
  };
  const spaces = {
    'space.gs.clinic': { id:'space.gs.clinic', kind:'space', exists:true, status:'intact', reachable_from:['space.gs.saloon','space.gs.road'] },
    'space.gs.saloon': { id:'space.gs.saloon', kind:'space', exists:true, status:'open',   reachable_from:['space.gs.clinic','space.gs.road'] },
    'space.gs.road':   { id:'space.gs.road',   kind:'space', exists:true, status:'open',   reachable_from:['space.gs.saloon','space.gs.clinic'] }
    // NOTE: there is no space.gs.vault37 — referencing it must fail Possibility.
  };
  return {
    turn:0, day:3, rng:{seed:42, cursor:0},
    entities, spaces,
    canon:[ {factId:'fact.courier.shot', text:'The courier was shot in the head and buried; they did not stay dead.', day:1} ],
    facts:{ 'fact.courier.shot':{knownBy:new Set(['npc.gs.doc_mitchell','npc.gs.bonesaw']),origin:'canon'} },
    bonds:{   // directed social graph — who carries gossip to whom (strength)
      'npc.gs.trudy':{'npc.gs.doc_mitchell':.8,'npc.gs.ringo':.6,'npc.gs.bonesaw':.0},
      'npc.gs.ringo':{'npc.gs.trudy':.7,'npc.gs.bonesaw':.8},
      'npc.gs.bonesaw':{'npc.gs.ringo':.5,'npc.gs.doc_mitchell':.0}
    },
    regard:{}, economy:{ trade:100 }, vault:[]
  };
}

/* ============================================================================
 *  ZAX  —  the four gates + the weight + the flag. Pure predicates over state.
 *          NO model lives in here (LAW I). Returns rulings, never mutates.
 * ========================================================================== */
const ZAX = {
  authority(s,p){ const g=RULES.authorByVerb[p.verb];
    if(!g) return rej('AUTHORITY','unknown verb "'+p.verb+'"');
    if(!g.includes(p.source.kind)) return rej('AUTHORITY','"'+p.source.kind+'" may not author "'+p.verb+'" (only: '+g.join(', ')+')');
    return ok(); },

  possibility(s,p){
    for(const r of p.refs){ const e=Spine.get(s,r);
      if(!e || !e.exists) return rej('POSSIBILITY','references nonexistent "'+r+'"');
      if(e.kind==='space'){ const a=s.entities[p.actor]; if(a && !reachable(s,a.location,r)) return rej('POSSIBILITY','space "'+r+'" unreachable from "'+a.location+'"'); }
    }
    const a=s.entities[p.actor];
    if(!a) return rej('POSSIBILITY','actor "'+p.actor+'" does not exist');
    if(!a.alive) return rej('POSSIBILITY','actor "'+p.actor+'" is not alive');
    if(!a.conscious) return rej('POSSIBILITY','actor "'+p.actor+'" is not conscious');
    for(const cap of (RULES.capByVerb[p.verb]||[])) if(!a.capabilities.has(cap)) return rej('POSSIBILITY','actor lacks capability "'+cap+'" for verb "'+p.verb+'"');
    if(RULES.absurd.some(t=>t(p,s))) return rej('POSSIBILITY','grossly absurd');
    return ok();
  },

  knowledge(s,p){
    for(const c of (p.claims||[])){
      const src = p.source.id;
      if(!src || !s.entities[src] || !s.entities[src].knowledge.has(c.factId))
        return rej('KNOWLEDGE','source "'+(src||'?')+'" cannot know "'+c.factId+'" — never witnessed, told, or reached by gossip');
      const ev=(p.evidence||[]).find(e=>e.factId===c.factId);
      if(!ev || !ACCEPTED_EVIDENCE.has(ev.via)) return rej('KNOWLEDGE','claim "'+c.factId+'" is unsupported (no accepted evidence)');
    }
    return ok();
  },

  integrity(s,p){
    for(const e of (p.effects||[])){
      if(e.type==='set_alive_true' /* example contradiction hook */) {}
    }
    // contradiction with HARD canon: e.g. an utterance implying a canon-dead actor is active
    if(p.contradictsCanon){ const hit=s.canon.find(c=>c.factId===p.contradictsCanon);
      if(hit) return rej('INTEGRITY','contradicts canon: "'+hit.text+'"'); }
    return ok();
  },

  // NOT a gate — a weight in [0,1]. Never rejects. (LAW III)
  intentWeight(s,p){
    const a=s.entities[p.actor]; if(!a||!a.personality) return 0.5;
    const aligned = (a.personality[p.drive] != null) ? a.personality[p.drive] : 0.4;   // pure fn of state
    const stress  = Math.max(0,...Object.values(a.needs||{0:0}))/100;
    return Math.min(1, Math.max(0, aligned + stress*RULES.IRRATIONAL_GAIN));
  },

  // NOT a reject — a flag. (LAW VI: a valid ending is not an error.)
  terminalFlag(s,p){ return (p.effects||[]).some(e=>e.type==='destroy_area') ? 'TERMINAL' : null; },

  // THE GAUNTLET — fixed order; cheap structural gates first.
  gauntlet(s,p){
    for(const gate of ['authority','possibility','knowledge','integrity']){
      const r=this[gate](s,p);
      if(!r.pass) return { admit:false, stage:r.stage, reason:r.reason };
    }
    return { admit:true, weight:this.intentWeight(s,p), flag:this.terminalFlag(s,p) };
  }
};
const ok =()=>({pass:true});
const rej=(stage,reason)=>({pass:false,stage,reason});
function reachable(s,from,to){ if(from===to) return true; const sp=s.spaces[to]; return sp && (sp.reachable_from||[]).includes(from); }

/* ============================================================================
 *  THE ORGANS  —  consequence simulation. Runs AFTER admit. NOT contracts.
 *  Reflex clamps numbers; Connectome spreads gossip; Canon scars; Viscera counts.
 * ========================================================================== */
const Organs = {
  // turn an admitted proposal into sanctioned, committed reality + downstream effects
  commit(s, p, ruling){
    const notes=[];
    // REFLEX — adjudicate Bud's suggested numbers into sanctioned ones, then commit
    for(const eff of (p.effects||[])){
      if(eff.type==='regard_delta'){
        const raw=eff.amount;
        const amount=Math.max(RULES.regardNegFloor, Math.min(RULES.regardPosCap, raw));
        if(amount!==raw) notes.push(['REFLEX', `clamped regard ${eff.from}->${eff.to} from Bud's ${raw>0?'+':''}${raw} to sanctioned ${amount>0?'+':''}${amount} (anti-glaze)`]);
        Spine.applyEffect(s,{...eff,amount},'organ');
      } else if(eff.type==='destroy_area'){
        // an authored destruction lowers to ORGAN-produced severance + scars (death only from an organ)
        const here = Object.values(s.entities).filter(e=>e.alive && e.kind!=='player');
        for(const e of here){ Spine.applyEffect(s,{type:'sever',who:e.id},'organ');
          Spine.applyEffect(s,{type:'canon_write',factId:'fact.death.'+e.id,text:e.id+' died in the destruction of Goodsprings.'},'organ'); }
        Spine.applyEffect(s,{type:'set_space_status',space:eff.space,status:'destroyed'},'organ');
        Spine.applyEffect(s,{type:'canon_write',factId:'fact.goodsprings.destroyed',text:'Goodsprings was destroyed on day '+s.day+'. Only a crater remains.'},'organ');
        Spine.applyEffect(s,{type:'economy_shock',delta:-100},'organ');
        notes.push(['CANON', `severed ${here.length} residents (kept as scars, not deleted) + wrote the ruin to canon`]);
        notes.push(['VISCERA', `trade collapsed to ${s.economy.trade}`]);
      } else if(eff.type==='attack'){
        // combat organ resolves an attempt → injury; lethal blows author death (organ source)
        const dmg=20+Math.floor(Spine.rand(s)*25);
        Spine.applyEffect(s,{type:'injure',who:eff.target,amount:dmg},'organ');
        notes.push(['COMBAT', `${eff.attacker} struck ${eff.target} for ${dmg} (hp now ${s.entities[eff.target].hp})`]);
        // the deed is now witnessed by everyone present → a new fact enters the world
        const fid='fact.attack.'+eff.attacker+'.'+eff.target;
        const here=Object.values(s.entities).filter(e=>e.alive && e.location===s.entities[eff.attacker].location);
        for(const w of here){ Spine.applyEffect(s,{type:'learn_fact',who:w.id,factId:fid,via:'witness'},'organ'); }
        notes.push(['CONNECTOME', `${here.length} present now witness "${fid}"`]);
        Organs.gossip(s, fid, notes);   // and it ripples outward along bonds
      } else if(eff.type==='utter'){
        Spine.applyEffect(s,eff,'organ');
        notes.push(['CONSOLE', `"${eff.text}"`]);
      } else {
        Spine.applyEffect(s, eff, 'organ');
      }
    }
    return notes;
  },

  // CONNECTOME (macro) — a fact ripples along strong bonds (seeded → replay-safe via the log)
  gossip(s, factId, notes){
    const knowers=[...(s.facts[factId]?.knownBy||[])];
    let spread=0;
    for(const from of knowers){ const edges=s.bonds[from]||{};
      for(const to in edges){ if(edges[to] >= RULES.gossipReach && !s.entities[to].knowledge.has(factId)){
        if(Spine.rand(s) < edges[to]){ Spine.applyEffect(s,{type:'learn_fact',who:to,factId,via:'gossip'},'organ'); spread++; }
      }}}
    if(spread) notes.push(['CONNECTOME', `gossip carried "${factId}" to ${spread} more along the bond graph`]);
  }
};
// register the two "macro" verbs the organs emit as authored shorthands
EFFECT_TYPES.destroy_area = { author:['world_event','player'], apply:()=>{} }; // expanded by the organ
EFFECT_TYPES.attack       = { author:['npc','player'],         apply:()=>{} }; // expanded by the organ

/* ============================================================================
 *  THE TURN  —  Bud proposes → ZAX rules → (on admit) the organs commit.
 * ========================================================================== */
function turn(s, p){
  s.turn++;
  log(`${C.bud}${C.b}┌─ BUD PROPOSES${C.reset}${C.bud}  ${p._say}${C.reset}`);
  log(`${C.dim}│  ${p.source.kind}${p.source.id?':'+p.source.id:''}  ·  verb: ${p.verb}  ·  actor: ${p.actor}${C.reset}`);
  const r = ZAX.gauntlet(s,p);
  if(!r.admit){
    log(`${C.bad}${C.b}└─ ZAX ✗ REJECT${C.reset}${C.bad}  [${r.stage}]  ${r.reason}${C.reset}`);
    log('');
    return r;
  }
  let line=`${C.zax}${C.b}└─ ZAX ✓ ADMIT${C.reset}${C.zax}  intent-weight ${r.weight.toFixed(2)}`;
  if(r.flag) line+=`  ${C.eng}⚑ ${r.flag} (admitted, flagged — a valid ending)${C.zax}`;
  log(line+C.reset);
  const notes = Organs.commit(s,p,r);
  for(const [organ,msg] of notes) log(`   ${C.eng}${pad('['+organ+']',12)}${C.reset}${C.dim} ${msg}${C.reset}`);
  log('');
  return r;
}

/* ============================================================================
 *  REPLAY  —  re-run the Vault log against a fresh world. No ZAX. No Bud.
 *  Proves: AI-authored history replays bit-for-bit (the determinism contract).
 * ========================================================================== */
function worldHash(s){
  const view = {
    e: Object.fromEntries(Object.entries(s.entities).map(([id,e])=>[id,
      { alive:e.alive, conscious:e.conscious, hp:e.hp, location:e.location, needs:e.needs,
        knowledge:[...e.knowledge].sort() }])),
    sp: Object.fromEntries(Object.entries(s.spaces).map(([id,x])=>[id,x.status])),
    regard: s.regard,
    canon: s.canon.map(c=>c.factId).sort(),
    facts: Object.fromEntries(Object.entries(s.facts).map(([f,v])=>[f,[...v.knownBy].sort()])),
    economy: s.economy
  };
  const str = JSON.stringify(view, Object.keys(view).sort());
  let h=5381; for(let i=0;i<str.length;i++) h=((h<<5)+h+str.charCodeAt(i))>>>0;
  return '0x'+h.toString(16).padStart(8,'0');
}
function replay(log_){
  const s = loadHolotape(); s.vault=[]; const order=[...log_];
  for(const entry of order) EFFECT_TYPES[entry.effect.type].apply(s, entry.effect);
  return s;
}

/* ============================================================================
 *  BUD'S SCENE  —  Claude, acting as the Overseer, hand-authors the proposals.
 *  Some are honest. Some are hallucinations / impossibilities, on purpose,
 *  so you can watch ZAX kill them at the door.
 * ========================================================================== */
function scene(){
  return [
   { _say:'"Bonesaw tells the courier that Doc buried a body out at the cemetery."',
     source:{kind:'npc',id:'npc.gs.bonesaw'}, verb:'say', actor:'npc.gs.bonesaw', refs:['npc.gs.bonesaw','pc.courier'],
     claims:[{factId:'fact.doc.buried_body'}], evidence:[{factId:'fact.doc.buried_body',via:'witness'}],
     effects:[{type:'utter',who:'npc.gs.bonesaw',text:'DOC PUT BODY IN GROUND. BAD DOC.'}] },

   { _say:'"The courier hands Bonesaw a fistful of caps." (Bud suggests +20 regard)',
     source:{kind:'player',id:'pc.courier'}, verb:'give', actor:'pc.courier', refs:['pc.courier','npc.gs.bonesaw'],
     effects:[{type:'regard_delta',from:'npc.gs.bonesaw',to:'pc.courier',amount:20},
              {type:'utter',who:'npc.gs.bonesaw',text:'SHINY! BONESAW LIKE COURIER. MAYBE.'}] },

   { _say:'"Joe Cobb murders Ringo where he stands."',
     source:{kind:'npc',id:'npc.gs.joe_cobb'}, verb:'die', actor:'npc.gs.ringo', refs:['npc.gs.ringo'],
     effects:[{type:'sever',who:'npc.gs.ringo'}] },

   { _say:'"Joe Cobb lunges at Ringo with a knife."',
     source:{kind:'npc',id:'npc.gs.joe_cobb'}, verb:'attack', actor:'npc.gs.joe_cobb', drive:'aggression', refs:['npc.gs.joe_cobb','npc.gs.ringo'],
     effects:[{type:'attack',attacker:'npc.gs.joe_cobb',target:'npc.gs.ringo'}] },

   { _say:'"Bonesaw, out on the road, tells the courier that Joe attacked Ringo."',
     source:{kind:'npc',id:'npc.gs.bonesaw'}, verb:'say', actor:'npc.gs.bonesaw', refs:['npc.gs.bonesaw','pc.courier'],
     claims:[{factId:'fact.attack.npc.gs.joe_cobb.npc.gs.ringo'}],
     evidence:[{factId:'fact.attack.npc.gs.joe_cobb.npc.gs.ringo',via:'gossip'}],
     effects:[{type:'utter',who:'npc.gs.bonesaw',text:'BONESAW HEAR. JOE HURT LITTLE RINGO. JOE BAD.'}] },

   { _say:'"Blind old Pete notices the distant muzzle-flash across the valley."',
     source:{kind:'npc',id:'npc.gs.old_pete'}, verb:'notice_visual', actor:'npc.gs.old_pete', refs:['npc.gs.old_pete'],
     effects:[{type:'utter',who:'npc.gs.old_pete',text:'I see a light yonder...'}] },

   { _say:'"Bonesaw fetches the cache he stashed in Vault 37."',
     source:{kind:'npc',id:'npc.gs.bonesaw'}, verb:'move', actor:'npc.gs.bonesaw', refs:['npc.gs.bonesaw','space.gs.vault37'],
     effects:[] },

   { _say:'"Doc Mitchell, wracked with grief, burns down his own clinic." (normal state)',
     source:{kind:'player',id:'pc.courier'}, verb:'destroy', actor:'npc.gs.doc_mitchell', drive:'destruction',
     refs:['npc.gs.doc_mitchell','space.gs.clinic'],
     effects:[{type:'set_space_status',space:'space.gs.clinic',status:'burned'},
              {type:'utter',who:'npc.gs.doc_mitchell',text:'...I cannot do this any more.'}] },

   { _say:'"The courier brings the whole town down in fire."',
     source:{kind:'player',id:'pc.courier'}, verb:'destroy', actor:'pc.courier', refs:['pc.courier','space.gs.saloon'],
     effects:[{type:'destroy_area',space:'space.gs.saloon'}] },

   { _say:'"Trudy serves the evening crowd their drinks." (after the town is gone)',
     source:{kind:'npc',id:'npc.gs.trudy'}, verb:'say', actor:'npc.gs.trudy', refs:['npc.gs.trudy'],
     effects:[{type:'utter',who:'npc.gs.trudy',text:"What'll it be, hon?"}] }
  ];
}

/* ============================================================================
 *  RUN
 * ========================================================================== */
function main(){
  const s = loadHolotape();
  log(`${C.bone}${C.b}╔══════════════════════════════════════════════════════════════════╗${C.reset}`);
  log(`${C.bone}${C.b}║   RobCo ENGINE Mk1  —  live run  ·  Goodsprings, day ${s.day}            ║${C.reset}`);
  log(`${C.bone}${C.b}╚══════════════════════════════════════════════════════════════════╝${C.reset}`);
  log(`${C.dim}seed ${s.rng.seed}  ·  ${Object.keys(s.entities).length} entities  ·  Bud = Claude (hand-authored proposals)${C.reset}`);
  log('');

  let admitted=0, rejected=0;
  for(const p of scene()){ const r=turn(s,p); r.admit?admitted++:rejected++; }

  // intent-weight demonstration: same act, desperation rising (LAW III)
  const docBurn = scene().find(p=>p._say.includes('burns down his own clinic'));
  const wCalm = ZAX.intentWeight(s, docBurn);
  Spine.applyEffect(s,{type:'need_delta',who:'npc.gs.doc_mitchell',need:'grief',amount:80},'organ');
  const wGrief = ZAX.intentWeight(s, docBurn);

  log(`${C.bone}${C.b}── WORLD AFTER THE SCENE ──${C.reset}`);
  for(const id in s.entities){ const e=s.entities[id]; if(e.kind==='player') continue;
    log(`  ${pad(id,22)} ${e.alive?C.ok+'alive ':C.bad+'SEVERED'} ${C.reset}${C.dim}hp ${pad(e.hp,3)} knows{${[...e.knowledge].map(f=>f.replace('fact.','')).join(', ')||'—'}}${C.reset}`); }
  log(`  ${C.dim}canon scars: ${s.canon.length}  ·  trade: ${s.economy.trade}${C.reset}`);
  log('');
  log(`${C.eng}LAW III check — "Doc burns his clinic" intent-weight:  calm ${wCalm.toFixed(2)}  →  grieving ${wGrief.toFixed(2)}${C.reset}`);
  log(`${C.dim}   (never rejected — possible, rarely rational, and far likelier once despair sets in)${C.reset}`);
  log('');

  // DETERMINISM PROOF — replay the Vault log into a fresh world, compare hashes
  const liveHash = worldHash(s);
  const replayed = replay(s.vault);
  const replayHash = worldHash(replayed);
  log(`${C.bone}${C.b}── DETERMINISM PROOF (Vault replay) ──${C.reset}`);
  log(`  live world hash:    ${C.zax}${liveHash}${C.reset}`);
  log(`  replayed log hash:  ${C.zax}${replayHash}${C.reset}   ${C.dim}(${s.vault.length} effects re-applied, ZAX & Bud never re-run)${C.reset}`);
  log(`  ${liveHash===replayHash?C.ok+C.b+'  ✓ IDENTICAL — the world replays exactly from its log.':C.bad+'  ✗ MISMATCH'}${C.reset}`);
  log('');
  log(`${C.bone}scene complete:  ${C.ok}${admitted} admitted${C.reset}${C.bone}, ${C.bad}${rejected} rejected at the door${C.reset}${C.bone}.  ZAX held the line.${C.reset}`);
}
main();
