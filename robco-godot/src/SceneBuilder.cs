using Godot;
using RobCo.Runtime;
using System.Text.Json;

namespace RobCoGodot;

/// <summary>
/// Builds the visible blockout from the runtime world + baked blockout geometry.
/// This class DRAWS. It decides nothing: portability, contents, reach — all runtime.
/// Interactables carry their placed-reference formid as metadata "ref".
/// </summary>
public static class SceneBuilder
{
    // Collision layers
    public const uint LayerWorld = 1;      // blocks movement, blocks ray
    public const uint LayerInteract = 2;   // ray-only (items don't trip the player)

    public static void Build(Node3D root, World world, JsonElement sceneRoot)
    {
        BuildBlockout(root, sceneRoot);
        BuildInstances(root, world);
        BuildLighting(root, world);
    }

    // ---- structural blockout: floor, perimeter walls, ceiling ----
    private static void BuildBlockout(Node3D root, JsonElement sceneRoot)
    {
        var blk = sceneRoot.GetProperty("blockout");
        var fl = blk.GetProperty("floor");
        double minX = fl.GetProperty("min")[0].GetDouble(), minY = fl.GetProperty("min")[1].GetDouble();
        double maxX = fl.GetProperty("max")[0].GetDouble(), maxY = fl.GetProperty("max")[1].GetDouble();
        double fz = fl.GetProperty("z").GetDouble();
        double wallH = blk.GetProperty("wall_height").GetDouble();

        var floorMat = Mat(new Color(0.28f, 0.24f, 0.19f)); // worn timber
        var wallMat = Mat(new Color(0.45f, 0.42f, 0.36f));  // plaster
        var ceilMat = Mat(new Color(0.32f, 0.30f, 0.27f));

        // floor slab
        AddBox(root, "Floor",
            center: Bridge.ToGodot((minX + maxX) / 2, (minY + maxY) / 2, fz - 8),
            size: Bridge.SizeToGodot(maxX - minX, maxY - minY, 16),
            yaw: 0, mat: floorMat, collide: true);

        // ceiling
        AddBox(root, "Ceiling",
            center: Bridge.ToGodot((minX + maxX) / 2, (minY + maxY) / 2, fz + wallH + 8),
            size: Bridge.SizeToGodot(maxX - minX, maxY - minY, 16),
            yaw: 0, mat: ceilMat, collide: true);

        int n = 0;
        foreach (var w in blk.GetProperty("walls").EnumerateArray())
        {
            var c = w.GetProperty("center");
            var s = w.GetProperty("size");
            AddBox(root, $"Wall{n++}",
                center: Bridge.ToGodot(c[0].GetDouble(), c[1].GetDouble(), c[2].GetDouble()),
                size: Bridge.SizeToGodot(s[0].GetDouble(), s[1].GetDouble(), s[2].GetDouble()),
                yaw: 0, mat: wallMat, collide: true);
        }
    }

    // ---- placed instances as OBND-sized boxes ----
    private static void BuildInstances(Node3D root, World world)
    {
        foreach (var inst in world.Instances)
        {
            var def = world.GetDefinition(inst.DefId)!;
            if (def.Kind is Kind.Light or Kind.Unknown) continue;   // lights handled separately

            var node = def.Kind == Kind.Actor
                ? BuildActor(inst, def)
                : BuildProp(inst, def);
            if (node is not null) root.AddChild(node);
        }
    }

    private static Node3D BuildActor(Instance inst, Definition def)
    {
        var body = new StaticBody3D { Name = $"Actor_{def.Edid}" };
        body.Position = Bridge.ToGodot(inst.Pos) + new Vector3(0, 0.95f, 0);
        body.Rotation = new Vector3(0, Bridge.YawToGodot(inst.Rot[2]), 0);
        body.CollisionLayer = LayerWorld | LayerInteract;
        var capsule = new CapsuleShape3D { Radius = 0.3f, Height = 1.85f };
        body.AddChild(new CollisionShape3D { Shape = capsule });
        var mesh = new MeshInstance3D
        {
            Mesh = new CapsuleMesh { Radius = 0.3f, Height = 1.85f },
            MaterialOverride = Mat(new Color(0.75f, 0.62f, 0.48f))
        };
        body.AddChild(mesh);
        body.SetMeta("ref", inst.Ref);
        body.SetMeta("label", def.Name ?? def.Edid ?? "?");
        body.SetMeta("interact", "actor");
        return body;
    }

    private static Node3D? BuildProp(Instance inst, Definition def)
    {
        // Some Bethesda ACTI records are invisible proximity/logic volumes, not physical
        // props — e.g. VCG01VigorTesterTrigger, whose real OBND (192×184×200 FNV units)
        // is a deliberately generous activation zone, not a mesh size. Rendering it as a
        // solid box is what makes the Vigor Tester look ~5x too big: you're seeing the
        // trigger volume, not the machine. Heuristic (verified against 4 real cases):
        // a trigger volume's own display name says "trigger" or has none; a real prop
        // reused as a trigger (e.g. "Gas Valve") keeps its real object name and stays
        // visible. Not architecturally final — a future exporter pass could flag this
        // explicitly in scene.json rather than guessing from names here.
        bool looksLikeTriggerVolume =
            (def.Edid?.Contains("Trigger", System.StringComparison.OrdinalIgnoreCase) ?? false) &&
            (def.Name is null || def.Name.Contains("trigger", System.StringComparison.OrdinalIgnoreCase));
        if (looksLikeTriggerVolume) return null;

        // OBND box in local FNV space; offset the mesh by the bounds centre so the
        // node origin stays at the authored position (matters for rotation).
        double sx, sy, sz, cx, cy, cz;
        if (def.Bounds is { Length: 6 } b && (b[3] - b[0]) + (b[4] - b[1]) + (b[5] - b[2]) > 0)
        {
            sx = b[3] - b[0]; sy = b[4] - b[1]; sz = b[5] - b[2];
            cx = (b[0] + b[3]) / 2.0; cy = (b[1] + b[4]) / 2.0; cz = (b[2] + b[5]) / 2.0;
        }
        else
        {
            (sx, sy, sz) = def.Kind switch
            {
                Kind.Item => (14.0, 14.0, 14.0),
                Kind.Furniture => (70.0, 70.0, 60.0),
                Kind.Container => (40.0, 40.0, 40.0),
                Kind.Door => (16.0, 90.0, 175.0),
                Kind.Activator => (30.0, 30.0, 60.0),
                _ => (30.0, 30.0, 30.0)
            };
            cx = 0; cy = 0; cz = sz / 2.0;
        }
        sx *= inst.Scale; sy *= inst.Scale; sz *= inst.Scale;
        cx *= inst.Scale; cy *= inst.Scale; cz *= inst.Scale;

        bool interactive = def.Kind is Kind.Item or Kind.Container or Kind.Door or Kind.Activator;
        bool blocks = def.Kind is Kind.Container or Kind.Furniture or Kind.Static or Kind.Door
                      && Mathf.Max((float)sx, (float)sy) > 20; // pencils don't stop a Courier

        var body = new StaticBody3D { Name = $"{def.Kind}_{def.Edid}_{inst.Ref}" };
        body.Position = Bridge.ToGodot(inst.Pos);
        body.Rotation = new Vector3(0, Bridge.YawToGodot(inst.Rot[2]), 0);
        body.CollisionLayer = (blocks ? LayerWorld : 0u) | (interactive ? LayerInteract : 0u);
        if (body.CollisionLayer == 0) body.CollisionLayer = LayerWorld; // decor statics still ray-block

        var size = Bridge.SizeToGodot(sx, sy, sz);
        var localCenter = new Vector3((float)cx * Bridge.U2M, (float)cz * Bridge.U2M, -(float)cy * Bridge.U2M);

        body.AddChild(new CollisionShape3D { Shape = new BoxShape3D { Size = size }, Position = localCenter });
        body.AddChild(new MeshInstance3D
        {
            Mesh = new BoxMesh { Size = size },
            Position = localCenter,
            MaterialOverride = Mat(ColorFor(def))
        });

        if (interactive)
        {
            body.SetMeta("ref", inst.Ref);
            body.SetMeta("label", def.Name ?? def.Edid ?? "?");
            body.SetMeta("interact", def.Kind switch
            {
                Kind.Item => "item",
                Kind.Container => "container",
                Kind.Door => "door",
                _ => "activator"
            });
        }
        return body;
    }

    private static void BuildLighting(Node3D root, World world)
    {
        // ambient so the blockout is never pitch black
        var env = new WorldEnvironment
        {
            Environment = new Godot.Environment
            {
                BackgroundMode = Godot.Environment.BGMode.Color,
                BackgroundColor = new Color(0.02f, 0.02f, 0.03f),
                AmbientLightSource = Godot.Environment.AmbientSource.Color,
                AmbientLightColor = new Color(0.5f, 0.48f, 0.42f),
                AmbientLightEnergy = 0.35f
            }
        };
        root.AddChild(env);

        // real ESM light placements → warm omnis
        foreach (var inst in world.Instances)
        {
            if (world.GetDefinition(inst.DefId)!.Kind != Kind.Light) continue;
            root.AddChild(new OmniLight3D
            {
                Position = Bridge.ToGodot(inst.Pos),
                LightColor = new Color(1.0f, 0.85f, 0.6f),
                LightEnergy = 1.6f,
                OmniRange = 4.5f,
                ShadowEnabled = false
            });
        }
    }

    private static StandardMaterial3D Mat(Color c) => new() { AlbedoColor = c, Roughness = 0.9f };

    private static Color ColorFor(Definition def) => def.Kind switch
    {
        Kind.Container => new Color(0.85f, 0.6f, 0.15f),           // amber: loot me
        Kind.Door => new Color(0.45f, 0.15f, 0.1f),
        Kind.Furniture => new Color(0.4f, 0.28f, 0.18f),
        Kind.Activator => new Color(0.2f, 0.7f, 0.7f),
        Kind.Item => def.ItemClass switch
        {
            ItemClass.Weapon => new Color(0.8f, 0.2f, 0.2f),
            ItemClass.Armor => new Color(0.25f, 0.4f, 0.8f),
            ItemClass.Consumable => new Color(0.3f, 0.75f, 0.3f),
            _ => new Color(0.65f, 0.65f, 0.6f)
        },
        _ => new Color(0.5f, 0.47f, 0.44f)
    };

    private static void AddBox(Node3D root, string name, Vector3 center, Vector3 size, float yaw,
        StandardMaterial3D mat, bool collide)
    {
        var body = new StaticBody3D { Name = name, Position = center, Rotation = new Vector3(0, yaw, 0) };
        body.CollisionLayer = LayerWorld;
        if (collide) body.AddChild(new CollisionShape3D { Shape = new BoxShape3D { Size = size } });
        body.AddChild(new MeshInstance3D { Mesh = new BoxMesh { Size = size }, MaterialOverride = mat });
        root.AddChild(body);
    }
}
