namespace RobCo.Runtime;

public sealed record ItemStack(string DefId, int Count);

/// <summary>A candidate rolled from imported leveled-list data at world init.</summary>
public sealed record LootCandidate(string DefId, int Count, int ChanceNone);

/// <summary>
/// A placed, mutable thing in the world. Instances mutate; definitions do not.
/// Position/rotation kept in native FNV units — the renderer converts, the engine never does.
/// </summary>
public sealed class Instance
{
    public required string Ref { get; init; }         // placed-reference formid
    public required string DefId { get; init; }
    public double[] Pos { get; init; } = new double[3];
    public double[] Rot { get; init; } = new double[3];
    public double Scale { get; init; } = 1.0;

    // -- mutable state --
    public bool Taken { get; set; }                   // item removed from the world
    public bool Opened { get; set; }                  // container has been looted at least once
    public List<ItemStack> Contents { get; } = new(); // containers only, rolled at init
    public List<LootCandidate> LootCandidates { get; } = new();
}

/// <summary>
/// An actor. Health is DERIVED, never stored: MaxHealth − Damage.
/// FNV formula: 95 + Endurance×20 + Level×5.
/// </summary>
public sealed class ActorState
{
    public required string Id { get; init; }
    public string? Name { get; init; }
    public int Level { get; set; } = 1;
    // SPECIAL — authored content. Plain integers: the engine bakes in no clamping game rules.
    public int Strength { get; set; } = 5;
    public int Perception { get; set; } = 5;
    public int Endurance { get; set; } = 5;
    public int Charisma { get; set; } = 5;
    public int Intelligence { get; set; } = 5;
    public int Agility { get; set; } = 5;
    public int Luck { get; set; } = 5;

    public int Damage { get; set; }                   // accumulated damage: the stored truth
    public int MaxHealth => 95 + Endurance * 20 + Level * 5;
    public int CurrentHealth => Math.Max(0, MaxHealth - Damage);
    public bool Alive => CurrentHealth > 0;

    public double CarryCapacity => 150 + 10 * Strength;   // FNV rule; lives on the actor, not in the stat

    public List<ItemStack> Inventory { get; } = new();
    public string? EquippedWeapon { get; set; }       // DefId
    public string? EquippedArmor { get; set; }        // DefId
}
