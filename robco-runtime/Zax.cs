namespace RobCo.Runtime;

/// <summary>
/// The four-gate adjudicator. Law 1: gate logic never simulates — ZAX only answers
/// "is this attempt admissible?", it never applies consequences.
/// Gate order is fixed and short-circuits: Authority → Possibility → Knowledge → Integrity.
/// </summary>
public static class Zax
{
    public const double ReachUnits = 180.0;   // interaction reach in FNV units (~2.6 m)

    public static Verdict Validate(World w, Command cmd)
    {
        var v = Authority(w, cmd);   if (!v.Ok) return v;
        v = Possibility(w, cmd);     if (!v.Ok) return v;
        v = Knowledge(w, cmd);       if (!v.Ok) return v;
        return Integrity(w, cmd);
    }

    // ---- Gate 1: AUTHORITY — is this actor allowed to attempt this at all? ----
    private static Verdict Authority(World w, Command cmd)
    {
        var actor = w.GetActor(cmd.ActorId);
        if (actor is null)
            return Verdict.Fail(Gate.Authority, $"no such actor '{cmd.ActorId}'");
        if (!actor.Alive)
            return Verdict.Fail(Gate.Authority, "dead actors attempt nothing");
        // v0: only the player is command-driven. NPCs act via their own systems later.
        if (cmd.ActorId != World.PlayerId)
            return Verdict.Fail(Gate.Authority, "only the player issues commands in this build");
        return Verdict.Pass();
    }

    // ---- Gate 2: POSSIBILITY — does the target exist, and is the act physically coherent? ----
    private static Verdict Possibility(World w, Command cmd)
    {
        var actor = w.GetActor(cmd.ActorId)!;
        switch (cmd)
        {
            case PickUp p:
            {
                var inst = w.GetInstance(p.Ref);
                if (inst is null) return Verdict.Fail(Gate.Possibility, $"no placed reference '{p.Ref}'");
                if (inst.Taken) return Verdict.Fail(Gate.Possibility, "already taken");
                var def = w.GetDefinition(inst.DefId)!;
                if (def.Kind != Kind.Item)
                    return Verdict.Fail(Gate.Possibility, $"a {def.Kind} is not portable");
                if (w.DistanceTo(actor, inst) > ReachUnits)
                    return Verdict.Fail(Gate.Possibility, "out of reach");
                return Verdict.Pass();
            }
            case TakeFromContainer t:
            {
                var inst = w.GetInstance(t.Ref);
                if (inst is null) return Verdict.Fail(Gate.Possibility, $"no placed reference '{t.Ref}'");
                var def = w.GetDefinition(inst.DefId)!;
                if (def.Kind != Kind.Container)
                    return Verdict.Fail(Gate.Possibility, $"a {def.Kind} is not a container");
                if (w.DistanceTo(actor, inst) > ReachUnits)
                    return Verdict.Fail(Gate.Possibility, "out of reach");
                if (!inst.Contents.Any(s => s.DefId == t.DefId && s.Count >= t.Count))
                    return Verdict.Fail(Gate.Possibility, "container does not hold that");
                return Verdict.Pass();
            }
            case TakeAll t:
            {
                var inst = w.GetInstance(t.Ref);
                if (inst is null) return Verdict.Fail(Gate.Possibility, $"no placed reference '{t.Ref}'");
                if (w.GetDefinition(inst.DefId)!.Kind != Kind.Container)
                    return Verdict.Fail(Gate.Possibility, "not a container");
                if (w.DistanceTo(actor, inst) > ReachUnits)
                    return Verdict.Fail(Gate.Possibility, "out of reach");
                return Verdict.Pass();
            }
            case UseItem u:
            {
                var def = w.GetDefinition(u.DefId);
                if (def is null) return Verdict.Fail(Gate.Possibility, "unknown item");
                if (!actor.Inventory.Any(s => s.DefId == u.DefId && s.Count > 0))
                    return Verdict.Fail(Gate.Possibility, "not carrying that");
                if (def.ItemClass != ItemClass.Consumable)
                    return Verdict.Fail(Gate.Possibility, $"{def.Name ?? def.Edid} is not consumable");
                return Verdict.Pass();
            }
            case EquipItem e:
            {
                var def = w.GetDefinition(e.DefId);
                if (def is null) return Verdict.Fail(Gate.Possibility, "unknown item");
                if (!actor.Inventory.Any(s => s.DefId == e.DefId && s.Count > 0))
                    return Verdict.Fail(Gate.Possibility, "not carrying that");
                if (def.ItemClass is not (ItemClass.Weapon or ItemClass.Armor))
                    return Verdict.Fail(Gate.Possibility, $"{def.Name ?? def.Edid} is not equippable");
                return Verdict.Pass();
            }
            case UnequipItem ue:
            {
                if (actor.EquippedWeapon != ue.DefId && actor.EquippedArmor != ue.DefId)
                    return Verdict.Fail(Gate.Possibility, "not equipped");
                return Verdict.Pass();
            }
            case DropItem d:
            {
                if (!actor.Inventory.Any(s => s.DefId == d.DefId && s.Count > 0))
                    return Verdict.Fail(Gate.Possibility, "not carrying that");
                return Verdict.Pass();
            }
            case SufferDamage:
                return Verdict.Pass();
        }
        return Verdict.Fail(Gate.Possibility, $"unhandled command '{cmd.Verb}'");
    }

    // ---- Gate 3: KNOWLEDGE — does the actor know enough for this attempt? ----
    // Physical acts on visible objects pass trivially in v0. This gate exists for the
    // Overseer (LLM) later: Bud may not act on facts his Terminal never learned.
    private static Verdict Knowledge(World w, Command cmd) => Verdict.Pass();

    // ---- Gate 4: INTEGRITY — would committing this corrupt world invariants? ----
    private static Verdict Integrity(World w, Command cmd)
    {
        if (cmd is TakeFromContainer t && t.Count <= 0)
            return Verdict.Fail(Gate.Integrity, "count must be positive");
        if (cmd is SufferDamage sd && sd.Amount <= 0)
            return Verdict.Fail(Gate.Integrity, "damage must be positive");
        return Verdict.Pass();
    }
}
