using System.Text;

namespace RobCo.Runtime;

/// <summary>
/// The world: definitions (immutable), instances (mutable), actors, and the event log.
/// The only mutation entry point is <see cref="Execute"/>. The frontend reads state
/// and submits commands; it never decides anything.
/// </summary>
public sealed class World
{
    public const string PlayerId = "player";

    private readonly Dictionary<string, Definition> _defs = new();
    private readonly Dictionary<string, Instance> _instances = new();
    private readonly Dictionary<string, ActorState> _actors = new();
    private readonly List<GameEvent> _log = new();
    private long _seq;

    public ulong Seed { get; private set; }
    public string CellName { get; internal set; } = "";
    public IReadOnlyList<GameEvent> Log => _log;
    public IEnumerable<Definition> Definitions => _defs.Values;
    public IEnumerable<Instance> Instances => _instances.Values;

    // Player position is FRONTEND state in v0 (Godot owns movement physics).
    // The frontend reports it so ZAX can gate by reach. FNV units.
    public double[] PlayerPos { get; } = new double[3];
    public void ReportPlayerPos(double x, double y, double z) { PlayerPos[0]=x; PlayerPos[1]=y; PlayerPos[2]=z; }

    internal void AddDefinition(Definition d) => _defs[d.Id] = d;
    internal void AddInstance(Instance i) => _instances[i.Ref] = i;
    internal void AddActor(ActorState a) => _actors[a.Id] = a;

    public Definition? GetDefinition(string id) => _defs.GetValueOrDefault(id);
    public Instance? GetInstance(string r) => _instances.GetValueOrDefault(r);
    public ActorState? GetActor(string id) => _actors.GetValueOrDefault(id);
    public ActorState Player => _actors[PlayerId];

    public double DistanceTo(ActorState actor, Instance inst)
    {
        // v0: only the player has a live position, reported by the frontend.
        var p = actor.Id == PlayerId ? PlayerPos : inst.Pos;
        double dx = p[0]-inst.Pos[0], dy = p[1]-inst.Pos[1], dz = p[2]-inst.Pos[2];
        return Math.Sqrt(dx*dx + dy*dy + dz*dz);
    }

    /// <summary>Roll container contents once from the seed. Same seed → same world. Ever.</summary>
    public void Initialize(ulong seed)
    {
        Seed = seed;
        var rng = new Rng(seed);
        foreach (var inst in _instances.Values.OrderBy(i => i.Ref, StringComparer.Ordinal))
        {
            if (inst.LootCandidates.Count == 0) continue;
            // v0 simplification (documented): FNV leveled lists pick one entry per roll;
            // we deterministically sample 1–3 candidates that beat their chance-none.
            int rolls = 1 + rng.NextInt(3);
            var picked = new Dictionary<string,int>();
            for (int i = 0; i < rolls && inst.LootCandidates.Count > 0; i++)
            {
                var c = inst.LootCandidates[rng.NextInt(inst.LootCandidates.Count)];
                if (rng.Percent() < c.ChanceNone) continue;
                picked[c.DefId] = picked.GetValueOrDefault(c.DefId) + Math.Max(1, c.Count);
            }
            inst.Contents.Clear();
            foreach (var (defId, count) in picked.OrderBy(k => k.Key, StringComparer.Ordinal))
                inst.Contents.Add(new ItemStack(defId, count));
        }
    }

    /// <summary>The gauntlet: validate through ZAX, commit on pass, log either way.</summary>
    public Verdict Execute(Command cmd)
    {
        var verdict = Zax.Validate(this, cmd);
        string detail = Describe(cmd);
        if (verdict.Ok) Commit(cmd);
        _log.Add(new GameEvent(_seq++, cmd.ActorId, cmd.Verb, detail, verdict.Ok, verdict.Reason));
        return verdict;
    }

    private static string Describe(Command cmd) => cmd switch
    {
        PickUp p => p.Ref,
        DropItem d => d.DefId,
        UseItem u => u.DefId,
        EquipItem e => e.DefId,
        UnequipItem ue => ue.DefId,
        TakeFromContainer t => $"{t.Ref}:{t.DefId}x{t.Count}",
        TakeAll t => t.Ref,
        SufferDamage sd => sd.Amount.ToString(),
        _ => ""
    };

    // ---- consequences. Only reachable through Execute → ZAX pass. ----
    private void Commit(Command cmd)
    {
        var actor = _actors[cmd.ActorId];
        switch (cmd)
        {
            case PickUp p:
            {
                var inst = _instances[p.Ref];
                inst.Taken = true;
                AddToInventory(actor, inst.DefId, 1);
                break;
            }
            case DropItem d:
                RemoveFromInventory(actor, d.DefId, 1);
                if (actor.EquippedWeapon == d.DefId && !Carrying(actor, d.DefId)) actor.EquippedWeapon = null;
                if (actor.EquippedArmor == d.DefId && !Carrying(actor, d.DefId)) actor.EquippedArmor = null;
                break;
            case UseItem u:
            {
                var def = _defs[u.DefId];
                RemoveFromInventory(actor, u.DefId, 1);
                // v0 consumable effects (simplified flat values, not FNV's over-time healing):
                if (def.IsMedicine) actor.Damage = Math.Max(0, actor.Damage - 30);
                else if (def.IsFood) actor.Damage = Math.Max(0, actor.Damage - 5);
                break;
            }
            case EquipItem e:
            {
                var def = _defs[e.DefId];
                if (def.ItemClass == ItemClass.Weapon) actor.EquippedWeapon = e.DefId;
                else actor.EquippedArmor = e.DefId;
                break;
            }
            case UnequipItem ue:
                if (actor.EquippedWeapon == ue.DefId) actor.EquippedWeapon = null;
                if (actor.EquippedArmor == ue.DefId) actor.EquippedArmor = null;
                break;
            case TakeFromContainer t:
            {
                var inst = _instances[t.Ref];
                RemoveFromContents(inst, t.DefId, t.Count);
                AddToInventory(actor, t.DefId, t.Count);
                inst.Opened = true;
                break;
            }
            case TakeAll t:
            {
                var inst = _instances[t.Ref];
                foreach (var s in inst.Contents) AddToInventory(actor, s.DefId, s.Count);
                inst.Contents.Clear();
                inst.Opened = true;
                break;
            }
            case SufferDamage sd:
                actor.Damage += sd.Amount;
                break;
        }
    }

    private static bool Carrying(ActorState a, string defId) => a.Inventory.Any(s => s.DefId == defId && s.Count > 0);

    private static void AddToInventory(ActorState a, string defId, int count)
    {
        var idx = a.Inventory.FindIndex(s => s.DefId == defId);
        if (idx >= 0) a.Inventory[idx] = a.Inventory[idx] with { Count = a.Inventory[idx].Count + count };
        else a.Inventory.Add(new ItemStack(defId, count));
        a.Inventory.Sort((x,y) => string.CompareOrdinal(x.DefId, y.DefId));  // deterministic order
    }

    private static void RemoveFromInventory(ActorState a, string defId, int count)
    {
        var idx = a.Inventory.FindIndex(s => s.DefId == defId);
        if (idx < 0) return;
        var left = a.Inventory[idx].Count - count;
        if (left > 0) a.Inventory[idx] = a.Inventory[idx] with { Count = left };
        else a.Inventory.RemoveAt(idx);
    }

    private static void RemoveFromContents(Instance i, string defId, int count)
    {
        var idx = i.Contents.FindIndex(s => s.DefId == defId);
        if (idx < 0) return;
        var left = i.Contents[idx].Count - count;
        if (left > 0) i.Contents[idx] = i.Contents[idx] with { Count = left };
        else i.Contents.RemoveAt(idx);
    }

    public double CarriedWeight(ActorState a) =>
        a.Inventory.Sum(s => (_defs.GetValueOrDefault(s.DefId)?.Weight ?? 0) * s.Count);

    /// <summary>FNV-1a hash over ordered world state. Two replays match ⇔ hashes match.</summary>
    public ulong StateHash()
    {
        var sb = new StringBuilder();
        foreach (var i in _instances.Values.OrderBy(i => i.Ref, StringComparer.Ordinal))
        {
            sb.Append(i.Ref).Append(':').Append(i.Taken ? 1 : 0).Append(':').Append(i.Opened ? 1 : 0);
            foreach (var s in i.Contents) sb.Append('|').Append(s.DefId).Append('x').Append(s.Count);
            sb.Append(';');
        }
        foreach (var a in _actors.Values.OrderBy(a => a.Id, StringComparer.Ordinal))
        {
            sb.Append(a.Id).Append(":dmg=").Append(a.Damage)
              .Append(":w=").Append(a.EquippedWeapon ?? "-").Append(":ar=").Append(a.EquippedArmor ?? "-");
            foreach (var s in a.Inventory) sb.Append('|').Append(s.DefId).Append('x').Append(s.Count);
            sb.Append(';');
        }
        ulong h = 14695981039346656037UL;
        foreach (byte b in Encoding.UTF8.GetBytes(sb.ToString())) { h ^= b; h *= 1099511628211UL; }
        return h;
    }
}
