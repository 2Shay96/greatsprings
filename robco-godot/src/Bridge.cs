using Godot;

namespace RobCoGodot;

/// <summary>
/// The ONLY place FNV units meet Godot space. The runtime speaks native ESM
/// coordinates forever; this class translates at the border and nowhere else.
/// FNV: Z-up, ~69.99 units per metre. Godot: Y-up, metres.
/// </summary>
public static class Bridge
{
    public const float UnitsPerMeter = 69.99f;
    public const float U2M = 1f / UnitsPerMeter;

    /// <summary>FNV (x east, y north, z up) → Godot (x east, y up, z south).</summary>
    public static Vector3 ToGodot(double x, double y, double z) =>
        new((float)x * U2M, (float)z * U2M, -(float)y * U2M);

    public static Vector3 ToGodot(double[] p) => ToGodot(p[0], p[1], p[2]);

    /// <summary>Godot → FNV, for reporting player position back to the runtime.</summary>
    public static (double x, double y, double z) ToFnv(Vector3 v) =>
        (v.X * UnitsPerMeter, -v.Z * UnitsPerMeter, v.Y * UnitsPerMeter);

    /// <summary>Bethesda yaw (rotZ, radians) → Godot Y rotation.</summary>
    public static float YawToGodot(double rz) => -(float)rz;

    /// <summary>Axis-aligned size in FNV units → Godot size (x, z, y swap).</summary>
    public static Vector3 SizeToGodot(double sx, double sy, double sz) =>
        new((float)sx * U2M, (float)sz * U2M, (float)sy * U2M);
}
