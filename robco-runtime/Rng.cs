namespace RobCo.Runtime;

/// <summary>
/// Deterministic xorshift64*. We do NOT use System.Random: its algorithm is an
/// implementation detail that can change between .NET versions, which would break
/// replay identity. This one is ours, forever.
/// </summary>
public sealed class Rng
{
    private ulong _state;
    public Rng(ulong seed) { _state = seed == 0 ? 0x9E3779B97F4A7C15UL : seed; }

    public ulong NextU64()
    {
        ulong x = _state;
        x ^= x >> 12; x ^= x << 25; x ^= x >> 27;
        _state = x;
        return x * 0x2545F4914F6CDD1DUL;
    }

    /// <summary>[0, maxExclusive)</summary>
    public int NextInt(int maxExclusive) => maxExclusive <= 0 ? 0 : (int)(NextU64() % (ulong)maxExclusive);

    /// <summary>[0,100)</summary>
    public int Percent() => NextInt(100);
}
