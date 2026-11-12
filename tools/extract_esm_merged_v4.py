#!/usr/bin/env python3
"""
RobCo Engine ESM Extractor v0.3 — full-ESM pass, mechanical-only.

Law 3: runtime never invents data. This script doesn't invent it either.
Anything not already trusted (WEAP DATA) comes out as raw hex, not a guessed
struct.unpack — a wrong decode asserted as fact is worse than no decode.

Never touches narrative content (dialogue, book/note/terminal bodies,
descriptions) — see NARRATIVE_FIELDS / CONTENT_SKIP_TYPES below. Only
formids, edids, names, bounding boxes, model paths, placements, and raw
mechanical subrecords.

Run this LOCALLY, against your own copy of FalloutNV.esm. The .esm never
needs to leave this machine — only full_extract.json does.

Usage: python3 extract_esm_full.py [path/to/FalloutNV.esm] [output.json]

--- v0.3 changelog (vs v0.2) ---
* WEAP: DATA now decoded to full 15-byte layout (value u32, health u32,
  weight f32, base damage i16, clip size u8). Damage/clip are marked
  VERIFY-FIRST: raw hex is also kept so you can spot-check vs xEdit.
* WEAP added to RAW_DUMP_TYPES: DNAM (fire rate/spread/range/etc), CRDT
  (crit data), NAM0 (ammo formid) now kept as raw hex.
* PACK added to RAW_DUMP_TYPES: PKDT/PSDT/PLDT/PTDT kept as raw hex.
  PSDT is the NPC schedule (see meta.decode_hints). Combined with the
  existing npc_packages (NPC -> PKID list), this is the full schedule chain.
* Greybox support: STAT/MSTT/DOOR/FURN/ACTI/LIGH added to RAW_DUMP_TYPES
  so their OBND boxes + MODL paths come out.
* MODL model paths captured everywhere (they're BSA file paths, not prose).
* REFR/ACHR/ACRE placement decoded: pos xyz + rot xyz (radians) + scale.
  cell_contents entries are now placed objects, not bare formids.
* CELL: XCLC grid coords + owning worldspace captured (new "cells" section).

--- v0.4 changelog (vs v0.3) ---
* BUGFIX: raw_fields was a dict keyed by tag, so any record with a REPEATED
  subrecord (CNTO on a multi-item container, CTDA on a multi-condition
  package) silently kept only the last occurrence and dropped the rest.
  raw_fields now accumulates a list per tag. No data loss on repeats.
* CNTO decoded (item formid u32 + count i32, 8 bytes) for CONT/CREA/NPC_ as
  a real `inventory` list — same confidence tier as OBND/placement, not a
  guess. Raw hex list is still kept alongside it for audit.
* PACK.PKDT type-byte decode is NOT promoted here — tested against known-name
  packages first (see spot-check notes); still raw-hex + hinted until a
  session confirms it against this actual ESM's bytes, not just docs.
* Explicitly does NOT adopt lossless/full-payload dumping. Every record type
  in CONTENT_SKIP_TYPES and every tag in NARRATIVE_FIELDS is still excluded
  entirely — not stored, not base64'd, not "kept just in case."
"""
import struct, zlib, json, sys, binascii
from collections import Counter, defaultdict

PATH = sys.argv[1] if len(sys.argv) > 1 else "/mnt/user-data/uploads/FalloutNV.esm"
OUT  = sys.argv[2] if len(sys.argv) > 2 else "full_extract.json"
COMPRESSED = 0x00040000

buf = open(PATH, "rb").read()

# ---- field (subrecord) parser, handles the XXXX >64KB override ----
def fields(raw):
    pos, n = 0, len(raw)
    override = None
    while pos + 6 <= n:
        sig = raw[pos:pos+4]
        size = struct.unpack_from('<H', raw, pos+4)[0]
        pos += 6
        if sig == b'XXXX':
            override = struct.unpack_from('<I', raw, pos)[0]
            pos += size
            continue
        if override is not None:
            size = override; override = None
        yield sig, raw[pos:pos+size]
        pos += size

def zstr(b):
    return b.split(b'\x00', 1)[0].decode('cp1252', 'replace')

def r2(v): return round(v, 2)
def r4(v): return round(v, 4)

# ============================================================================
# POLICY: what this script will and will not touch
# ============================================================================

# Record types whose CONTENT we never parse beyond formid/edid — dialogue,
# books, notes, terminals, quest text. Only structural extraction is
# committable; full text stays out entirely.
CONTENT_SKIP_TYPES = {b'INFO', b'BOOK', b'NOTE', b'TERM', b'MESG', b'QUST', b'DIAL'}

# Subrecord tags that carry prose wherever they appear. Denylist is deliberately
# explicit and auditable rather than implicit-by-omission. Not guaranteed
# exhaustive — if you spot other text-bearing tags in the output, add them
# here and re-run before sending anything onward.
NARRATIVE_FIELDS = {
    b'DESC',                                                   # descriptions
    b'NAM1', b'RNAM',                                          # dialogue response/speaker text
    b'TX00', b'TX01', b'TX02', b'TX03', b'TX04',
    b'TX05', b'TX06', b'TX07', b'TX08', b'TX09',                # dialogue variant text
    b'CNAM',                                                    # book/note body text
    b'ITXT',                                                    # topic info text
}

# Record types that get a raw-hex mechanical dump beyond the universal
# formid/edid/full/obnd/model index.
RAW_DUMP_TYPES = {
    # inventory / actors (v0.2)
    b'ARMO', b'ALCH', b'AMMO', b'MISC', b'CONT', b'NPC_', b'CREA',
    # v0.3: weapons get full raw dump too (DNAM/CRDT/NAM0), DATA decode below
    b'WEAP',
    # v0.3: AI packages — PSDT here is the NPC time schedule
    b'PACK',
    # v0.3: world objects for greyboxing (OBND + MODL path)
    b'STAT', b'MSTT', b'DOOR', b'FURN', b'ACTI', b'LIGH',
}

# Subrecords kept as raw hex for RAW_DUMP_TYPES — undecoded on purpose.
# Cross-check against Definitions.cs's already-verified logic before trusting
# a decode of these. See meta.decode_hints for documented layouts to verify.
RAW_KEEP_FIELDS = {
    b'DATA', b'DNAM', b'ENIT', b'ACBS', b'CNTO',
    b'CRDT', b'NAM0', b'ETYP',                     # v0.3: weapon crit/ammo/equip-type
    b'PKDT', b'PSDT', b'PLDT', b'PTDT',            # v0.3: package type/SCHEDULE/loc/target
}

# Documented-but-unverified layouts. Spot-check a few records against xEdit,
# then promote to a real decode in the next version. DO NOT trust blindly.
DECODE_HINTS = {
    "PACK.PSDT": "8 bytes: month i8, day-of-week i8 (-1=any), date u8, time i8 (hour, -1=any), duration i32 (hours). THE schedule.",
    "PACK.PKDT": "FNV: flags u32, type u8, unused, behavior flags u16, type-specific flags u16 (+padding; length varies by version).",
    "PACK.PLDT": "12 bytes: type i32, location u32 (formid or cell), radius i32.",
    "PACK.PTDT": "12 bytes: type i32, target u32 (formid), count/distance i32.",
    "WEAP.DNAM": "large struct: anim type, speed, reach, flags, ammo use, min/max range, spread, fire rate, reload time, skill, crit % mult... verify field-by-field vs xEdit before decoding.",
    "WEAP.CRDT": "16 bytes: crit damage u16, pad, crit % mult f32, flags u8, pad x3, crit effect formid u32.",
    "WEAP.NAM0": "4 bytes: ammo formid u32.",
    "WEAP.DATA[12:15]": "damage i16 + clip size u8 — decoded in output as damage/clip_size but VERIFY vs xEdit; raw hex retained.",
    "SPOTCHECK RESULTS (this ESM, this session)": {
        "ALCH.DATA": "CONFIRMED weight f32 — distribution across all 189 records clusters on 1.0/0.0/0.5/0.25, not noise.",
        "ALCH.ENIT[0:4]": "CONFIRMED value i32 — Stimpak=75, sane small integers throughout.",
        "ALCH.ENIT[4]": "CONFIRMED flags byte — bit 0x04=IsMedicine fires only on Stimpak/Rad-X/RadAway (not Buffout/Psycho/Jet/Med-X/Mentats, which are Chems not Medicine); bit 0x02=IsFood fires on meat/water/beans. Matches Definitions.cs. Caveat: Nuka-Cola has no food bit (plausibly a Hardcore-hunger distinction, not a decode error) — worth a second look.",
        "ARMO.DATA": "CONFIRMED value u32/health u32/weight f32, same 12-byte shape as WEAP.DATA. Sane values across Leather/Metal/Combat/Legate's armor.",
        "ARMO.DNAM[4:8]": "CONFIRMED DT (float). Leather=6, Metal=12, Combat Armor Reinforced Mk2=20, Legate's=15. Clothing (Jessup's Bandana, Vault 21 Jumpsuit, Pre-War Hat) correctly shows DT=0.",
        "PACK.PKDT[4]": "STRONG (not certain) — type byte matched 9/11 Goodsprings packages tested against name-implied type (Sleep/Sandbox/Eat/Travel/FleeNotCombat all confirmed across independent NPCs). 2 mismatches are plausibly wrong *expectations*, not wrong decodes (GunfightPackage->Guard, AtBarPackage->Travel are both defensible Bethesda conventions). Safe to use, keep an eye on it.",
        "WEAP.DATA[12:15] damage/clip_size": "RELIABLE FOR FIREARMS ONLY. Melee/thrown weapons (Combat Knife, Baseball Bat, Frag Grenade) show suspiciously identical clip_size values (12, or 1) across unrelated weapon types — classic signature of an unused/default field, not authored data. Do not trust damage/clip_size on non-ranged weapons; raw hex is retained so this can be revisited.",
    },
}

# ---- storage ----
counts = Counter()
by_formid = {}
cell_contents = defaultdict(lambda: {"actors": [], "objects": []})
cells = {}                            # cell formid -> {grid, worldspace}
weapons = []
npc_packages = defaultdict(list)
edid_index = {}
mechanical_raw = defaultdict(list)   # sig -> [ {formid, edid, full, obnd, model, raw:{tag:hex}} ]

def handle(sig, formid, flags, data, parent_cell, parent_world):
    counts[sig] += 1
    if flags & COMPRESSED:
        try:
            data = zlib.decompress(data[4:])
        except Exception:
            return

    edid = full = model = None
    weap_value = weap_health = weap_weight = weap_damage = weap_clip = None
    base_name = None
    pkids = []
    obnd = grid = placement = None
    scale = None
    raw_fields = defaultdict(list)   # tag -> [hex, hex, ...] — repeats are NOT lost
    inventory = []                    # decoded CNTO entries, CONT/CREA/NPC_ only

    skip_content = sig in CONTENT_SKIP_TYPES

    for fsig, fdata in fields(data):
        if fsig in NARRATIVE_FIELDS:
            continue  # never stored, not even as raw hex

        if fsig == b'EDID':
            edid = zstr(fdata)
        elif fsig == b'FULL' and not skip_content:
            full = zstr(fdata)
        elif fsig == b'MODL' and not skip_content:
            model = zstr(fdata)   # BSA-relative .nif path — mechanical, not prose
        elif fsig == b'OBND' and len(fdata) == 12:
            # 6 x int16: x1,y1,z1,x2,y2,z2 — well-documented, high confidence
            obnd = list(struct.unpack_from('<6h', fdata, 0))
        elif fsig == b'NAME' and sig in (b'ACHR', b'ACRE', b'REFR'):
            if len(fdata) >= 4:
                base_name = struct.unpack_from('<I', fdata, 0)[0]
        elif fsig == b'PKID' and len(fdata) >= 4:
            pkids.append(struct.unpack_from('<I', fdata, 0)[0])
        elif fsig == b'DATA' and sig == b'WEAP':
            # WEAP DATA (FNV), 15 bytes: value u32, health u32, weight f32 (trusted),
            # base damage i16, clip size u8 (documented — VERIFY vs xEdit).
            if len(fdata) >= 12:
                weap_value, weap_health, weap_weight = struct.unpack_from('<IIf', fdata, 0)
            if len(fdata) >= 15:
                weap_damage, weap_clip = struct.unpack_from('<hB', fdata, 12)
            raw_fields['DATA'].append(binascii.hexlify(fdata).decode())  # keep for audit
        elif fsig == b'DATA' and sig in (b'REFR', b'ACHR', b'ACRE') and len(fdata) >= 24:
            # placement: 6 x f32 — posX,posY,posZ, rotX,rotY,rotZ (radians).
            # Well-documented, high confidence. This is the greybox layout data.
            px, py, pz, rx, ry, rz = struct.unpack_from('<6f', fdata, 0)
            placement = [r2(px), r2(py), r2(pz), r4(rx), r4(ry), r4(rz)]
        elif fsig == b'SCAL' and len(fdata) >= 4:
            scale = round(struct.unpack_from('<f', fdata, 0)[0], 3)
        elif fsig == b'XCLC' and sig == b'CELL' and len(fdata) >= 8:
            # exterior cell grid coords: x i32, y i32 — well-documented
            grid = list(struct.unpack_from('<2i', fdata, 0))
        elif fsig == b'CNTO' and sig in (b'CONT', b'CREA', b'NPC_') and len(fdata) >= 8:
            # inventory entry: item formid u32, count i32 — as universal/simple as
            # OBND, same confidence tier. A record can list many of these.
            item_fid, item_count = struct.unpack_from('<Ii', fdata, 0)
            inventory.append({"item": f"{item_fid:08X}", "count": item_count})
            raw_fields['CNTO'].append(binascii.hexlify(fdata).decode())
        elif sig in RAW_DUMP_TYPES and fsig in RAW_KEEP_FIELDS and not skip_content:
            raw_fields[fsig.decode()].append(binascii.hexlify(fdata).decode())

    if edid:
        edid_index[edid] = formid
    by_formid[formid] = (sig.decode(), edid, full)

    if sig == b'WEAP':
        weapons.append({
            "formid": f"{formid:08X}", "edid": edid, "name": full,
            "value": weap_value, "weight": weap_weight, "health": weap_health,
            # VERIFY-FIRST fields — documented layout, spot-check vs xEdit:
            "damage": weap_damage, "clip_size": weap_clip,
            "model": model,
        })
    if sig == b'NPC_' and pkids:
        npc_packages[formid] = pkids
    if sig == b'CELL':
        cells[f"{formid:08X}"] = {
            "grid": grid,
            "worldspace": f"{parent_world:08X}" if parent_world is not None else None,
        }
    if sig in RAW_DUMP_TYPES and (edid or full or obnd or raw_fields or model or inventory):
        entry = {
            "formid": f"{formid:08X}", "edid": edid, "full": full,
            "obnd": obnd, "model": model, "raw": dict(raw_fields)
        }
        if inventory:
            entry["inventory"] = inventory   # decoded, not raw — CNTO is high-confidence
        mechanical_raw[sig.decode()].append(entry)
    if parent_cell is not None and base_name is not None:
        entry = {"base": f"{base_name:08X}", "placement": placement, "scale": scale}
        if sig in (b'ACHR', b'ACRE'):
            cell_contents[parent_cell]["actors"].append(entry)
        elif sig == b'REFR':
            cell_contents[parent_cell]["objects"].append(entry)

# ---- recursive group/record walk ----
sys.setrecursionlimit(10000)
def walk(start, end, parent_cell=None, parent_world=None):
    pos = start
    while pos + 24 <= end:
        sig = buf[pos:pos+4]
        size = struct.unpack_from('<I', buf, pos+4)[0]
        if sig == b'GRUP':
            gtype = struct.unpack_from('<i', buf, pos+12)[0]
            gend = pos + size
            cp, wp = parent_cell, parent_world
            if gtype == 1:                       # worldspace children — label = WRLD formid
                wp = struct.unpack_from('<I', buf, pos+8)[0]
            elif gtype in (6, 8, 9, 10):         # cell children — label = CELL formid
                cp = struct.unpack_from('<I', buf, pos+8)[0]
            walk(pos+24, gend, cp, wp)
            pos = gend
        else:
            flags = struct.unpack_from('<I', buf, pos+8)[0]
            formid = struct.unpack_from('<I', buf, pos+12)[0]
            ds = pos + 24
            de = ds + size
            handle(sig, formid, flags, buf[ds:de], parent_cell, parent_world)
            pos = de

walk(0, len(buf))

# ---- report ----
print("=== RECORD INVENTORY (top 30 types) ===")
total = sum(counts.values())
print(f"total records: {total:,}")
for sig, c in counts.most_common(30):
    print(f"  {sig.decode('latin-1'):5s} {c:>8,}")

# ---- portable JSON export (this is what goes onward, not the .esm) ----
index = [
    {"formid": f"{fid:08X}", "type": sig, "edid": edid, "full": full}
    for fid, (sig, edid, full) in by_formid.items()
    if edid or full   # drop unnamed/uninteresting placement records from the grep index
]

output = {
    "meta": {
        "source": PATH.split("/")[-1],
        "extractor": "v0.4-merged",
        "total_records": total,
        "record_type_counts": {k.decode('latin-1'): v for k, v in counts.items()},
        "excluded_content_types": sorted(t.decode() for t in CONTENT_SKIP_TYPES),
        "excluded_narrative_fields": sorted(t.decode() for t in NARRATIVE_FIELDS),
        "decode_hints": DECODE_HINTS,
        "units_note": "placement = [x,y,z, rotX,rotY,rotZ(rad)]; 1 game unit ~ 1.428cm (~70 units/m); Z-up.",
    },
    "index": index,
    "weapons": weapons,
    "npc_packages": {f"{k:08X}": [f"{p:08X}" for p in v] for k, v in npc_packages.items()},
    "cells": cells,
    "cell_contents": {f"{cell:08X}": v for cell, v in cell_contents.items()},
    "mechanical_raw": dict(mechanical_raw),
}

with open(OUT, "w") as f:
    json.dump(output, f, separators=(",", ":"))

import os
size_mb = os.path.getsize(OUT) / (1024 * 1024)
print(f"\n[wrote {OUT}: {size_mb:.1f} MB]")
if size_mb > 100:
    print("!! over 100MB — trim: (a) drop 'index' entries with no edid, (b) drop")
    print("   cell_contents for worldspaces you aren't greyboxing yet, or (c) drop")
    print("   mechanical_raw types you don't need. Placements are the bulk of it.")
else:
    print("under the 100MB limit — safe to send full_extract.json onward")
