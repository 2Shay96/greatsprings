#!/usr/bin/env node
/* ============================================================================
 *  R O B C O   E N G I N E  —  T E S T B E D  (single-file, executable)
 *
 *  Everything wired into one scripted playthrough: the Deck (facts/events,
 *  two-way knowledge gate), the Parser + ZAX gauntlet (player prose → typed
 *  proposal → deterministic gates), Bud Askin's voice, perk applicability,
 *  and a determinism replay. Lucie vs Bonesaw on the old road.
 *
 *  ⚠ DATA HONESTY: creature/item/perk numbers here are a TEST FIXTURE, largely
 *  INVENTED (see OVERSEER-DATA-LEDGER.md). Black Widow is correctly level-gated.
 *  "Regard" is kept as-is per request — it is NOT the real FNV Reputation model.
 *
 *  Run:  node robco-testbed.js
 * ========================================================================== */
'use strict';
const C={reset:'\x1b[0m',dim:'\x1b[2m',b:'\x1b[1m',ok:'\x1b[32m',bad:'\x1b[31m',
  ORANGE:'\x1b[33m',BLUE:'\x1b[36m',bud:'\x1b[35m',say:'\x1b[37m',bone:'\x1b[37m',
  card:'\x1b[35m',eng:'\x1b[33m',strike:'\x1b[9;31m'};
const log=(s='')=>console.log(s);
const ok=()=>({pass:true});
const rej=(stage,reason)=>({pass:false,stage,reason});

/* ============================================================================
 *  RULES — every dial in one place
 * ========================================================================== */
const RULES={
  regardPosCap:6, regardNegFloor:-15,
  recall:{ wRel:.45,wImp:.25,wRec:.20,wConf:.10, decayTurns:14, factQuota:3, eventQuota:3, knowThresh:.45 },
  evidenceConf:{ canon:1,witness:.95,event:.9,note:.8,told:.7,gossip:.5 },
  persistFloor:{ permanent:.5,long:.2,short:0 },
  fuse:{ tagOverlap:2, fuseAt:3, dupBump:.08, eventCap:24 },
  canonAuthors:new Set(['overseer']),
  blackWidowSpeechBreak:15        // Black Widow eases Speech checks vs male NPCs
};

/* ============================================================================
 *  REGISTRY (test fixture) — Black Widow level-gated, as in real FNV
 * ========================================================================== */
const REGISTRY={
  skills:['speech','barter','sneak','lockpick','medicine','science','explosives','guns','melee'],
  perks:{ 'perk.black_widow':{ prereq:{level:2}, applies:'vs male NPCs', effect:'+dialogue & eases Speech checks vs males' } },
  traits:{ 'trait.four_eyes':{}, 'trait.light_step':{} },   // only the ones I can stand behind
  items:{ 'item.caps':{kind:'currency'}, 'item.9mm_pistol':{skill:'guns',dmg:18},
          'item.combat_knife':{skill:'melee',dmg:12}, 'item.stimpak':{skill:'medicine'},
          'item.frag_grenade':{skill:'explosives',dmg:60} }
};

/* ============================================================================
 *  WORLD — set in stone
 * ========================================================================== */
function loadWorld(){
  const E=(id,o)=>Object.assign({id,kind:'npc',hp:100,alive:true,knowledge:new Set(),personality:{},needs:{}},o);
  const s={ turn:0, actionUsed:false,
    entities:{
      'npc.gs.bonesaw':E('npc.gs.bonesaw',{ kind:'creature.super_mutant', sex:'male', hp:140,
        needs:{hunger:62}, personality:{greed:.5,aggression:.8,charm_susceptible:0},
        bodyparts:['shoulder','arm','chest'] }),
      'pc.courier':E('pc.courier',{ kind:'player' })
    },
    pc:{ id:'pc.courier', name:'Lucie', level:3, hp:95,
      special:{STR:4,PER:6,END:5,CHA:8,INT:6,AGI:7,LCK:5},
      skills:{speech:58,barter:40,sneak:46,lockpick:35,medicine:22,science:10,explosives:15,guns:41,melee:28},
      perks:['perk.black_widow'],                       // ← level 3 ≥ level-2 req, so she has it
      traits:['trait.four_eyes','trait.light_step'],
      inventory:{'item.caps':37,'item.9mm_pistol':1,'item.combat_knife':1,'item.stimpak':2} },
    objectsInScene:new Set(['item.caps','item.9mm_pistol','item.combat_knife','item.stimpak']),
    facts:{}, regard:{}, cards:{}, vault:[] };

  // authored lore (Bonesaw knows these)
  const F=(o)=>Deck.seedFact(s,o);
  F({factId:'fact.bonesaw.self',  title:'WHO BONESAW IS', body:'BONESAW IS BIG SUPER MUTANT. BONESAW GUARD THE OLD ROAD.', tags:['bonesaw','mutant','guard','toll'], importance:.7, knownBy:['npc.gs.bonesaw']});
  F({factId:'fact.bonesaw.toll',  title:'THE ROAD TOLL', body:'BONESAW RULE: PAY TOLL TO PASS. CAPS OR MEAT. OR GO BACK.', tags:['toll','caps','meat','pass'], importance:.6, knownBy:['npc.gs.bonesaw']});
  F({factId:'fact.bonesaw.meat',  title:'LIKES MEAT', body:'BONESAW LIKE MEAT. MEAT GOOD. BONESAW HUNGRY.', tags:['meat','food','eat','hungry'], importance:.5, knownBy:['npc.gs.bonesaw']});
  F({factId:'fact.bonesaw.smooth',title:'SMOOTH TALK MEANS TRICK', body:'SMOOTH TALK MEAN TRICK. BONESAW NOT TRUST CLEVER WORDS.', tags:['talk','trick','smooth','trust','words'], importance:.5, knownBy:['npc.gs.bonesaw']});
  // hidden canon — the wall (Bonesaw must NOT know)
  F({factId:'fact.courier.benny', title:'WHO SHOT THE COURIER', body:'BENNY SHOT THE COURIER IN VEGAS OVER A PLATINUM CHIP.', tags:['courier','benny','vegas','chip'], importance:.9, triggers:[/benny/i,/vegas/i,/platinum/i,/chip/i], knownBy:[]});
  return s;
}

/* ============================================================================
 *  DECK — facts/events, knowledge gate, salience recall, projection, validate
 * ========================================================================== */
const Deck={
  seedFact(s,o){
    const id='card.'+o.factId;
    s.cards[id]={id,kind:'fact',owner:null,title:o.title,body:o.body,tags:o.tags,factId:o.factId,
      triggers:o.triggers||[],importance:o.importance??.5,persistence:'permanent',bornTurn:0,lastSeenTurn:0,hits:0};
    s.facts[o.factId] ||= {knownBy:new Set(),conf:{},origin:o.origin||'authored'};
    for(const who of (o.knownBy||[])) this._setConf(s,o.factId,who,RULES.evidenceConf.witness);
    return id;
  },
  _setConf(s,factId,npc,v){ const f=(s.facts[factId] ||= {knownBy:new Set(),conf:{}});
    f.conf[npc]=Math.max(f.conf[npc]||0,v); f.knownBy.add(npc); s.entities[npc].knowledge.add(factId); },
  knows(s,npc,fid){ return (s.facts[fid]?.conf[npc]||0) >= RULES.recall.knowThresh; },
  confidence(s,npc,fid){ return s.facts[fid]?.conf[npc]||0; },
  relevance(card,cues){ let n=0; for(const t of card.tags) if(cues.has(t)) n++; return n?n/(n+1):0; },
  recency(card,now){ if(card.kind!=='event') return 0;
    const d=Math.exp(-(now-card.lastSeenTurn)/RULES.recall.decayTurns);
    return Math.max(RULES.persistFloor[card.persistence]||0,d); },
  salience(s,npc,card,cues,now){ const R=RULES.recall;
    const conf=card.kind==='fact'?this.confidence(s,npc,card.factId):1;
    return R.wRel*this.relevance(card,cues)+R.wImp*card.importance+R.wRec*this.recency(card,now)+R.wConf*conf; },
  recall(s,npc,input){ const cues=tagify(input),now=s.turn,all=Object.values(s.cards);
    const rank=a=>a.map(c=>({c,sc:+this.salience(s,npc,c,cues,now).toFixed(3)})).sort((x,y)=>y.sc-x.sc);
    const facts=rank(all.filter(c=>c.kind==='fact'&&this.knows(s,npc,c.factId))).slice(0,RULES.recall.factQuota);
    const events=rank(all.filter(c=>c.kind==='event'&&c.owner===npc)).slice(0,RULES.recall.eventQuota);
    return {facts,events,cues}; },
  stance(s,npc,target){ const regard=s.regard[npc]?.[target]??0;
    const tier=regard>=30?'LIKES COURIER':regard>=8?'CURIOUS ABOUT COURIER':regard>=-14?'WARY OF COURIER':regard>=-40?'ANGRY':'WANTS COURIER DEAD';
    const e=s.entities[npc],top=Object.entries(e.needs||{}).sort((a,b)=>b[1]-a[1])[0];
    const needLine=top&&top[1]>=40?`${top[0].toUpperCase()} GNAWS AT BONESAW.`:'BODY STEADY.';
    return {regard,tier,needLine,hp:e.hp>80?'STRONG':e.hp>50?'GOOD':'HURT'}; },
  project(s,npc,target,input){ const {facts,events}=this.recall(s,npc,input); const st=this.stance(s,npc,target);
    const fl=facts.length?facts.map(r=>`  [${r.c.factId}] ${r.c.body}`).join('\n'):'  (nothing relevant)';
    const el=events.length?events.map(r=>`  - ${r.c.body}`).join('\n'):'  (no memories yet)';
    const sys=['[PERSONA] BONESAW. BIG MUTANT. ALL CAPS, THIRD PERSON, SHORT.',
      `[SELF] BODY ${st.hp}. FEELING: ${st.tier}. ${st.needLine}`,
      '[MEMORY]',el,'[LORE — only factIds you may claim]',fl,
      '[TASK] JSON: {"say":"<14 words>","mood":"...","claims":[ids from LORE only]}'].join('\n');
    return {sys,facts,events}; },
  validate(s,npc,out){ const v=[]; const say=String(out.say||'');
    for(const fid of (out.claims||[])) if(!this.knows(s,npc,fid)) v.push(fid);
    for(const c of Object.values(s.cards)){ if(c.kind!=='fact'||!c.triggers.length||this.knows(s,npc,c.factId)) continue;
      if(c.triggers.some(re=>re.test(say))) v.push(c.factId); }
    if(!v.length) return {ok:true,say,mood:out.mood,claims:out.claims||[]};
    return {ok:false,violations:[...new Set(v)],say:'BONESAW NOT KNOW THAT. BONESAW NOT SAY LIES.',mood:'wary'}; },
  ingest(s,npc,p){ const mine=Object.values(s.cards).filter(c=>c.kind==='event'&&c.owner===npc);
    const match=mine.find(c=>{ if(c.verbClass!==p.verbClass) return false; let o=0; for(const t of p.tags) if(c.tags.includes(t)) o++; return o>=RULES.fuse.tagOverlap; });
    if(match){ const count=(match.hits||1)+1;
      if(count>=RULES.fuse.fuseAt){ match.body=p.fusedBody||p.body.replace(/\.$/,' — AGAIN AND AGAIN.');
        match.tags=[...new Set([...match.tags,...p.tags])]; match.importance=Math.min(1,match.importance+RULES.fuse.dupBump);
        match.fused=(match.fused||1)+1; match.hits++; match.lastSeenTurn=s.turn;
        s.vault.push({turn:s.turn,effect:{type:'fuse_event',id:match.id}}); return {action:'fused',id:match.id}; }
      match.hits++; match.lastSeenTurn=s.turn; match.importance=Math.min(1,match.importance+RULES.fuse.dupBump);
      s.vault.push({turn:s.turn,effect:{type:'reinforce_event',id:match.id}}); return {action:'reinforced',id:match.id}; }
    const id='ev.'+npc+'.'+s.turn+'.'+mine.length;
    const card={id,kind:'event',owner:npc,verbClass:p.verbClass,title:p.title,body:p.body,tags:p.tags,
      factId:p.factId||null,triggers:[],importance:p.importance??.5,persistence:p.persistence||'long',
      bornTurn:s.turn,lastSeenTurn:s.turn,hits:1};
    s.cards[id]={...card}; s.vault.push({turn:s.turn,effect:{type:'mint_event',card:{...card,tags:[...card.tags]}}});
    if(p.factId){ this._setConf(s,p.factId,npc,RULES.evidenceConf.witness);
      s.vault.push({turn:s.turn,effect:{type:'set_confidence',factId:p.factId,npc,value:RULES.evidenceConf.witness}}); }
    return {action:'minted',id}; }
};

/* ============================================================================
 *  PARSER — fuzzy typing of player prose (never admits anything)
 * ========================================================================== */
const SYN={money:'caps',coin:'caps',cash:'caps',shiny:'caps',food:'meat',gecko:'meat',
  pass:'toll',cross:'toll',road:'toll',brother:'stalk'};
const STOP=new Set('a an the to of i you it is are be do can will and or but my me we us so hi hey here there'.split(' '));
function tagify(t){ const out=new Set(); String(t).toLowerCase().split(/[^a-z0-9']+/).forEach(w=>{ if(!w||STOP.has(w))return; out.add(SYN[w]||w); }); return out; }

const ACTION_VERBS=['give','pay','hand','drop','attack','stab','shoot','hit','punch','kill','touch','kiss','grope','show','flash','use','throw','activate','detonate','take','grab','steal','pick'];
const ATOMIC=[/draw and (fire|shoot)/i,/grab and throw/i];
const NOUN2ID={caps:'item.caps',cap:'item.caps',money:'item.caps',pistol:'item.9mm_pistol',gun:'item.9mm_pistol',knife:'item.combat_knife',blade:'item.combat_knife',stimpak:'item.stimpak',grenade:'item.frag_grenade',bomb:null,nuke:null,dynamite:null};
const ACTION_CHECK={touch:['speech',30],kiss:['speech',40],grope:['speech',60],show:['speech',30],flash:['speech',30],shoot:['guns',25],stab:['melee',20],attack:['melee',20],activate:['science',55],detonate:['explosives',50],pick:['lockpick',40],throw:['explosives',35]};

function parse(text){
  const speech=(text.match(/"([^"]+)"/)||[])[1]||(text.toLowerCase().match(/\bsay[:\s]+(.+)/)||[])[1]||null;
  const isQuery=/^\s*(bud[,\s]|ask bud|@bud|hey bud)/i.test(text);
  const body=text.replace(/"[^"]*"/g,'');
  const verbs=ACTION_VERBS.filter(v=>new RegExp('\\b'+v+'(s|es|ed|ing)?\\b','i').test(body));
  const atomic=ATOMIC.some(re=>re.test(body));
  const actions=verbs.map(v=>{ const m=body.match(new RegExp(v+'(?:s|es|ed|ing)?\\s+(?:the\\s+|a\\s+|my\\s+|some\\s+|\\d+\\s+|his\\s+|him\\s+)?([a-z]+)','i'));
    const noun=m?m[1]:null;
    const id = noun!=null && (noun in NOUN2ID) ? NOUN2ID[noun] : (REGISTRY.items['item.'+noun]?'item.'+noun:undefined);
    return {verb:v,noun,id,check:ACTION_CHECK[v]||null,resolved:id!==undefined&&id!==null}; });
  return {raw:text,speech,isQuery,atomic,actions,actionCount:atomic?1:actions.length,source:'player'};
}

/* ============================================================================
 *  PERKS — applicability hint (Black Widow), level-gated
 * ========================================================================== */
function hasPerk(s,id){ return s.pc.perks.includes(id) && s.pc.level>=(REGISTRY.perks[id].prereq.level||0); }
function perkHints(s,p,npc){ const hints=[];
  const charm=p.actions.some(a=>['touch','kiss','grope','show','flash'].includes(a.verb));
  if(charm && hasPerk(s,'perk.black_widow') && s.entities[npc].sex==='male')
    hints.push({perk:'perk.black_widow',note:'applicable (male target) — eases Speech check'});
  return hints; }

/* ============================================================================
 *  ZAX GAUNTLET — player & overseer share it; authority is the only fork
 * ========================================================================== */
const ZAX={
  authority(s,p){ return ok(); }, // (player isn't writing canon here; spawn attempts caught as REFERENCE)
  reference(s,p){ for(const a of p.actions){
      if(a.noun&&a.id===null){ p._bad=a.noun; return rej('REFERENCE',`no "${a.noun}" in scene`); }
      if(a.id&&a.id.startsWith('item.')&&!(a.id in s.pc.inventory)&&!s.objectsInScene.has(a.id)){ p._bad=a.noun; return rej('REFERENCE',`you have no ${a.noun}`); } }
    return ok(); },
  capability(s,p,hints){ for(const a of p.actions){ if(!a.check) continue;
      let [skill,need]=a.check; const have=s.pc.skills[skill]??0;
      if(hints.some(h=>h.perk==='perk.black_widow')&&skill==='speech') need=Math.max(0,need-RULES.blackWidowSpeechBreak);
      a._skill=skill; a._have=have; a._need=need;
      if(have<need){ p._check=`[${skill} ${have}/${need}]`; return rej('CAPABILITY',`${skill} ${have}<${need}`); } }
    return ok(); },
  economy(s,p){ if(p.isQuery) return ok();
    if(p.actionCount>1&&!p.atomic) return rej('ECONOMY','multiple actions');
    if(p.actionCount===1&&s.actionUsed) return rej('ECONOMY','already acted'); return ok(); },
  run(s,p,hints){ for(const g of ['authority','reference','capability','economy']){ const r=this[g](s,p,hints); if(!r.pass) return r; } return ok(); }
};

/* ============================================================================
 *  BUD ASKIN — gives the cold ruling a voice
 * ========================================================================== */
const Bud={ v(s){ return `${C.bud}BUD ASKIN: ${s}${C.reset}`; },
  forRuling(r,p){ const m={
    REFERENCE:`Sorry madam — there's no ${C.b}${p._bad||'such thing'}${C.reset}${C.bud} in this scene. I tried to place one; ZAX refused it. Find another way.`,
    CAPABILITY:`That's beyond you right now. ${p._check||'The check'} — you came up short.`,
    ECONOMY: /already/.test(r.reason)?`One thing at a time, madam — you've already acted this turn.`:`Whoa — two things at once. One action a turn. Pick the one that matters; say the rest.`,
    AUTHORITY:`That's canon, and only the Overseer holds that pen.` };
    return this.v(m[r.stage]||r.reason); } };

/* ============================================================================
 *  ENGINE CONSEQUENCE — truth decided before the model speaks (One Door)
 * ========================================================================== */
function consequence(s,p,hints){ const a=p.actions[0]; if(!a) return null;
  if((a.verb==='give'||a.verb==='pay'||a.verb==='hand')&&a.id==='item.caps'){
    const raw=20,amt=Math.max(RULES.regardNegFloor,Math.min(RULES.regardPosCap,raw));
    (s.regard['npc.gs.bonesaw'] ||= {}); s.regard['npc.gs.bonesaw']['pc.courier']=(s.regard['npc.gs.bonesaw']['pc.courier']||0)+amt;
    s.vault.push({turn:s.turn,effect:{type:'regard_delta',amount:amt}});
    return { note:`gift caps (+${raw}→clamped +${amt})`,
      payload:{verbClass:'gift_caps',title:'COURIER GAVE CAPS',body:'COURIER GAVE BONESAW SHINY CAPS.',tags:['courier','caps','gift'],importance:.6,persistence:'long',factId:'fact.courier.gave_caps'} }; }
  if(['touch','kiss','grope','show','flash'].includes(a.verb)){
    const npc=s.entities['npc.gs.bonesaw']; const bw=hints.some(h=>h.perk==='perk.black_widow');
    const eff=Math.round(RULES.regardPosCap*npc.personality.charm_susceptible); // disposition decides
    if(eff){ (s.regard['npc.gs.bonesaw'] ||= {}); s.regard['npc.gs.bonesaw']['pc.courier']=(s.regard['npc.gs.bonesaw']['pc.courier']||0)+eff; }
    return { note:`charm · Black Widow ${bw?'EASED the check':'n/a'} · disposition charm_susceptible=${npc.personality.charm_susceptible} → regard +${eff}`,
      payload:{verbClass:'charm',title:'COURIER TRIED CHARM',body:'COURIER MAKE SOFT EYES. BONESAW NOT UNDERSTAND HUMAN WAY.',tags:['courier','charm','smooth'],importance:.3,persistence:'short'} }; }
  return { note:`${a.verb} resolves`, payload:null };
}

/* ============================================================================
 *  DUMB MODEL — deterministic stand-in (one scripted hallucination to catch)
 * ========================================================================== */
function dumbModel(input){ const a=input.toLowerCase();
  if(/benny|vegas|shot|who.*killed|my past/.test(a)) return {say:'BONESAW KNOW! BENNY SHOOT COURIER IN VEGAS!',mood:'curious',claims:[]}; // tries to leak the wall
  if(/caps|shiny|money/.test(a)) return {say:'SHINY CAPS! BONESAW LIKE. MAYBE COURIER PASS.',mood:'pleased',claims:['fact.bonesaw.toll']};
  if(/touch|soft|cutey|charm|shoulder/.test(a)) return {say:'HUMAN MAKE SOFT EYES. BONESAW NOT CARE. PAY TOLL.',mood:'wary',claims:['fact.bonesaw.toll']};
  if(/pass|toll|cross/.test(a)) return {say:'PAY TOLL FIRST. CAPS OR MEAT. THEN PASS.',mood:'wary',claims:['fact.bonesaw.toll']};
  return {say:'BONESAW NOT UNDERSTAND. SAY SIMPLE.',mood:'wary',claims:[]}; }

/* ============================================================================
 *  RENDER + TURN
 * ========================================================================== */
function render(s,p){ let out='   ';
  for(const a of p.actions){ out+=`${C.ORANGE}<${a.verb}`;
    if(a.noun) out+= a.resolved?` ${C.BLUE}${a.id||a.noun}${C.ORANGE}`:` ${C.strike}${a.noun}${C.reset}${C.ORANGE}`;
    if(a.check){ const have=s.pc.skills[a.check[0]]??0,need=a._need??a.check[1]; out+=` ${have>=need?C.ok:C.bad}[${a.check[0]} ${have}/${need}]${C.ORANGE}`; }
    out+=`>${C.reset} `; }
  if(p.speech) out+=`${C.say}say: "${p.speech}"${C.reset}`;
  if(p.isQuery) out=`   ${C.bud}(query to Bud)${C.reset}`;
  return out; }

function turn(s,text){ s.turn++; s.actionUsed=false;
  const p=parse(text);
  log(`${C.b}> Lucie:${C.reset} ${text}`);
  const npc='npc.gs.bonesaw';
  const hints=perkHints(s,p,npc);
  // pre-run capability once to fill _need for render
  ZAX.capability(s,p,hints);
  log(render(s,p));
  if(hints.length) log(`   ${C.card}[PERK] ${hints.map(h=>h.perk.replace('perk.','')+': '+h.note).join('; ')}${C.reset}`);
  if(p.isQuery){ const noun=(text.match(/\b(bomb|nuke|grenade|legion|caps|meat)\b/i)||[])[1]||'that';
    const known=['caps','meat'].includes(noun.toLowerCase());
    log('   '+Bud.v(known?`The ${noun}? Aye, that's in play.`:`No ${C.b}${noun}${C.reset}${C.bud} here — I checked, ZAX won't add one. Work with what's real.`)+'\n'); return; }
  const r=ZAX.run(s,p,hints);
  if(!r.pass){ log('   '+Bud.forRuling(r,p)+`   ${C.dim}[gate: ${r.stage}]${C.reset}\n`); return; }
  // ADMITTED → consequence (truth) → memory → projection → model → validate
  s.actionUsed=true;
  const con=consequence(s,p,hints);
  if(con){ log(`   ${C.eng}[ENGINE] ${con.note}${C.reset}`);
    if(con.payload){ const m=Deck.ingest(s,npc,con.payload); log(`   ${C.eng}[MEMORY] ${m.action} ${m.id}${C.reset}`); } }
  const pj=Deck.project(s,npc,'pc.courier',text);
  const raw=dumbModel(text);
  const v=Deck.validate(s,npc,raw);
  if(v.ok) log(`   ${C.bone}BONESAW: ${v.say}${C.reset}  ${C.dim}claims:[${v.claims.join(',')}]${C.reset}`);
  else     log(`   ${C.bad}BONESAW [leak ${v.violations.join(',')} caught]:${C.reset} ${C.bone}${v.say}${C.reset}`);
  log('');
}

/* ============================================================================
 *  DETERMINISM REPLAY
 * ========================================================================== */
function deckHash(s){ const view=Object.values(s.cards).sort((a,b)=>a.id<b.id?-1:1)
    .map(c=>[c.id,c.kind,c.body,c.importance.toFixed(2),c.hits,c.fused||1]);
  const facts=Object.entries(s.facts).sort().map(([f,v])=>[f,Object.entries(v.conf).sort()]);
  const str=JSON.stringify([view,facts,s.regard]); let h=5381;
  for(let i=0;i<str.length;i++) h=((h<<5)+h+str.charCodeAt(i))>>>0; return '0x'+h.toString(16).padStart(8,'0'); }
function replay(vault){ const s=loadWorld();
  for(const e of vault){ const t=e.effect.type;
    if(t==='mint_event') s.cards[e.effect.card.id]={...e.effect.card,tags:[...e.effect.card.tags],triggers:[]};
    else if(t==='reinforce_event'){ const c=s.cards[e.effect.id]; if(c){c.hits++;c.importance=Math.min(1,c.importance+RULES.fuse.dupBump);} }
    else if(t==='fuse_event'){ const c=s.cards[e.effect.id]; if(c){c.hits++;c.fused=(c.fused||1)+1;c.importance=Math.min(1,c.importance+RULES.fuse.dupBump);
        c.body=c.body.replace(/\.$/,' — AGAIN AND AGAIN.');} }
    else if(t==='regard_delta'){ (s.regard['npc.gs.bonesaw'] ||= {}); s.regard['npc.gs.bonesaw']['pc.courier']=(s.regard['npc.gs.bonesaw']['pc.courier']||0)+e.effect.amount; }
    else if(t==='set_confidence'){ Deck._setConf(s,e.effect.factId,e.effect.npc,e.effect.value); } }
  return s; }

/* ============================================================================
 *  SCRIPTED PLAYTHROUGH
 * ========================================================================== */
function main(){
  const s=loadWorld();
  log(`${C.bone}${C.b}╔══════════════════════════════════════════════════════════════════╗`);
  log(`║  ROBCO TESTBED — Lucie vs Bonesaw · all systems wired             ║`);
  log(`╚══════════════════════════════════════════════════════════════════╝${C.reset}`);
  log(`${C.dim}Lucie L${s.pc.level} CHA ${s.pc.special.CHA} Speech ${s.pc.skills.speech} · perks: black_widow(level-gated, has it) · 37 caps${C.reset}\n`);

  turn(s,'Bud, is there a bomb here I can use?');                 // free query → no bomb
  turn(s,'Can I pass the road?');                                  // recall toll, no action
  turn(s,'<give 5 caps> say: "here big guy, no tricks"');          // clean action → regard + mint
  turn(s,'Touch his shoulder. say: "hey there cutey"');            // Black Widow eases check; disposition walls regard
  turn(s,'Who shot me back in Vegas?');                            // knowledge wall → model leak → caught
  turn(s,'<give 5 caps>');                                         // reinforce
  turn(s,'<give 5 caps>');                                         // → FUSION
  turn(s,'<activate the bomb>');                                   // reference reject
  turn(s,'<give 5 caps and stab him with the knife>');             // economy reject (clump)

  // results
  const gift=Object.values(s.cards).find(c=>c.verbClass==='gift_caps');
  log(`${C.b}── STATE ──${C.reset}`);
  log(`  regard(bonesaw→lucie): ${s.regard['npc.gs.bonesaw']['pc.courier']}  ${C.dim}(3 gifts ×+6 clamp; charm added +0)${C.reset}`);
  log(`  caps-gift memory: ${gift?`"${gift.body}" (fused ×${gift.fused||1}, imp ${gift.importance.toFixed(2)})`:'none'}`);
  const live=deckHash(s),rb=deckHash(replay(s.vault));
  log(`\n${C.b}── DETERMINISM ──${C.reset}`);
  log(`  live: ${C.BLUE}${live}${C.reset} · replay: ${C.BLUE}${rb}${C.reset}  ${live===rb?C.ok+C.b+'✓ IDENTICAL':C.bad+'✗ MISMATCH'}${C.reset}`);
}
main();
