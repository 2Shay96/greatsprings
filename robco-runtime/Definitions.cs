namespace RobCo.Runtime;

/// <summary>Closed enum. Greppability is sacred: new kinds are a design decision, not a runtime event.</summary>
public enum Kind { Static, Item, Container, Door, Actor, Furniture, Activator, Light, Unknown }

public enum ItemClass { None, Weapon, Armor, Consumable, Misc }

/// <summary>
/// Immutable definition imported from FalloutNV.esm. Law 4: definitions never mutate.
/// All mutable state lives on <see cref="Instance"/>.
/// </summary>
public sealed record Definition
{
    public required string Id { get; init; }          // formid, e.g. "00015169"
    public string? Edid { get; init; }                // greppable editor id
    public string? Name { get; init; }                // display name
    public Kind Kind { get; init; }
    public ItemClass ItemClass { get; init; }
    public int Value { get; init; }
    public double Weight { get; init; }
    public int Health { get; init; }                  // item condition pool (weapons/armor)
    public double DamageThreshold { get; init; }      // armor DT (verified DNAM decode)
    public bool IsFood { get; init; }                 // ALCH ENIT flag 0x02 (verified)
    public bool IsMedicine { get; init; }             // ALCH ENIT flag 0x04 (verified)
    public int[]? Bounds { get; init; }               // OBND [x1,y1,z1,x2,y2,z2], FNV units

    public static Kind KindFromSig(string sig) => sig switch
    {
        "WEAP" or "ARMO" or "ALCH" or "MISC" or "AMMO" or "BOOK" or "KEYM" or "NOTE" => Kind.Item,
        "CONT" => Kind.Container,
        "DOOR" => Kind.Door,
        "NPC_" or "CREA" => Kind.Actor,
        "FURN" => Kind.Furniture,
        "ACTI" => Kind.Activator,
        "LIGH" => Kind.Light,
        "STAT" or "MSTT" => Kind.Static,
        _ => Kind.Unknown
    };

    public static ItemClass ClassFromSig(string sig) => sig switch
    {
        "WEAP" => ItemClass.Weapon,
        "ARMO" => ItemClass.Armor,
        "ALCH" => ItemClass.Consumable,
        "MISC" or "AMMO" or "BOOK" or "KEYM" or "NOTE" => ItemClass.Misc,
        _ => ItemClass.None
    };
}
