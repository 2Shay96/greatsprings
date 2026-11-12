namespace RobCo.Runtime;

public enum Gate { None, Authority, Possibility, Knowledge, Integrity }

/// <summary>ZAX's answer. Pass or the exact gate + reason it died at. Never silent.</summary>
public sealed record Verdict(bool Ok, Gate FailedGate, string Reason)
{
    public static Verdict Pass() => new(true, Gate.None, "ok");
    public static Verdict Fail(Gate g, string reason) => new(false, g, reason);
}

/// <summary>One line of history. The Vault is append-only; replaying the log rebuilds the world.</summary>
public sealed record GameEvent(long Seq, string ActorId, string Verb, string Detail, bool Ok, string Reason);
