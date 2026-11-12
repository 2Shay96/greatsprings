namespace RobCo.Runtime;

/// <summary>
/// Commands are attempts, never authorship. No caller writes state directly —
/// every mutation goes Command → ZAX gates → commit → event log.
/// </summary>
public abstract record Command(string ActorId)
{
    public abstract string Verb { get; }
}

public sealed record PickUp(string ActorId, string Ref) : Command(ActorId)
{ public override string Verb => "pick_up"; }

public sealed record DropItem(string ActorId, string DefId) : Command(ActorId)
{ public override string Verb => "drop"; }

public sealed record UseItem(string ActorId, string DefId) : Command(ActorId)
{ public override string Verb => "use"; }

public sealed record EquipItem(string ActorId, string DefId) : Command(ActorId)
{ public override string Verb => "equip"; }

public sealed record UnequipItem(string ActorId, string DefId) : Command(ActorId)
{ public override string Verb => "unequip"; }

public sealed record TakeFromContainer(string ActorId, string Ref, string DefId, int Count) : Command(ActorId)
{ public override string Verb => "take_from_container"; }

public sealed record TakeAll(string ActorId, string Ref) : Command(ActorId)
{ public override string Verb => "take_all"; }

/// <summary>Damage from the environment/frontend (falls, hazards). Even harm is an attempt,
/// never a direct write — otherwise it escapes the Vault and replay diverges.</summary>
public sealed record SufferDamage(string ActorId, int Amount) : Command(ActorId)
{ public override string Verb => "suffer_damage"; }
