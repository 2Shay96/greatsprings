using System.Text.Json;

namespace RobCo.Runtime;

/// <summary>
/// Loads a baked scene.json (produced by the deterministic ESM importer) into a World.
/// Law 3: runtime never invents data — everything here was extracted or authored upstream.
/// Takes a JSON string, not a path: the runtime does no platform IO, the frontend feeds it.
/// </summary>
public static class ContentLoader
{
    public static World LoadScene(string sceneJson, ulong seed)
    {
        using var doc = JsonDocument.Parse(sceneJson);
        var root = doc.RootElement;
        var w = new World { CellName = root.GetProperty("cell").GetProperty("name").GetString() ?? "?" };

        foreach (var p in root.GetProperty("definitions").EnumerateObject())
        {
            var d = p.Value;
            string sig = d.GetProperty("sig").GetString() ?? "?";
            var stats = d.TryGetProperty("stats", out var st) ? st : default;
            w.AddDefinition(new Definition
            {
                Id = p.Name,
                Edid = d.TryGetProperty("edid", out var e) ? e.GetString() : null,
                Name = d.TryGetProperty("name", out var n) ? n.GetString() : null,
                Kind = Definition.KindFromSig(sig),
                ItemClass = Definition.ClassFromSig(sig),
                Value = stats.ValueKind == JsonValueKind.Object && stats.TryGetProperty("value", out var v) ? v.GetInt32() : 0,
                Weight = stats.ValueKind == JsonValueKind.Object && stats.TryGetProperty("weight", out var wt) ? wt.GetDouble() : 0,
                Health = stats.ValueKind == JsonValueKind.Object && stats.TryGetProperty("health", out var h) ? h.GetInt32() : 0,
                DamageThreshold = stats.ValueKind == JsonValueKind.Object && stats.TryGetProperty("dt", out var dt) ? dt.GetDouble() : 0,
                IsFood = stats.ValueKind == JsonValueKind.Object && stats.TryGetProperty("is_food", out var f) && f.GetBoolean(),
                IsMedicine = stats.ValueKind == JsonValueKind.Object && stats.TryGetProperty("is_medicine", out var m) && m.GetBoolean(),
                Bounds = d.TryGetProperty("bounds", out var b) ? b.EnumerateArray().Select(x => x.GetInt32()).ToArray() : null
            });
        }

        var loot = root.TryGetProperty("loot_tables", out var lt) ? lt : default;

        foreach (var ie in root.GetProperty("instances").EnumerateArray())
        {
            var inst = new Instance
            {
                Ref = ie.GetProperty("ref").GetString()!,
                DefId = ie.GetProperty("def").GetString()!,
                Pos = ie.GetProperty("pos").EnumerateArray().Select(x => x.GetDouble()).ToArray(),
                Rot = ie.GetProperty("rot").EnumerateArray().Select(x => x.GetDouble()).ToArray(),
                Scale = ie.TryGetProperty("scale", out var sc) ? sc.GetDouble() : 1.0
            };
            if (loot.ValueKind == JsonValueKind.Object && loot.TryGetProperty(inst.Ref, out var cands))
            {
                foreach (var c in cands.EnumerateArray())
                {
                    // candidates are already filtered to item sigs by the importer
                    string defId = c.GetProperty("formid").GetString()!;
                    EnsureLootDefinition(w, c, defId);
                    inst.LootCandidates.Add(new LootCandidate(
                        defId,
                        c.GetProperty("count").GetInt32(),
                        c.GetProperty("chance_none").GetInt32()));
                }
            }
            w.AddInstance(inst);
        }

        // The Courier — authored content, not ESM (FNV chargen is script-driven; verified last pass).
        w.AddActor(new ActorState { Id = World.PlayerId, Name = "Courier" });

        w.Initialize(seed);
        return w;
    }

    /// <summary>Loot candidates may reference defs never placed in the cell; register them from the loot entry.</summary>
    private static void EnsureLootDefinition(World w, JsonElement c, string defId)
    {
        if (w.GetDefinition(defId) is not null) return;
        string sig = c.GetProperty("sig").GetString() ?? "MISC";
        w.AddDefinition(new Definition
        {
            Id = defId,
            Edid = c.TryGetProperty("edid", out var e) ? e.GetString() : null,
            Name = c.TryGetProperty("name", out var n) ? n.GetString() : null,
            Kind = Definition.KindFromSig(sig),
            ItemClass = Definition.ClassFromSig(sig)
        });
    }
}
