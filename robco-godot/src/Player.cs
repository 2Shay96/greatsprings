using Godot;
using RobCo.Runtime;

namespace RobCoGodot;

/// <summary>
/// First-person body. Godot owns movement physics (that's rendering-adjacent);
/// every meaningful act is a Command submitted to the runtime. This class never
/// mutates world state — it asks, and displays the verdict.
/// </summary>
public partial class Player : CharacterBody3D
{
    public Game Game = null!;

    private Camera3D _cam = null!;
    private RayCast3D _ray = null!;
    private float _pitch;

    private const float Speed = 3.6f;
    private const float LookSens = 0.0022f;
    private const float Gravity = 9.8f;
    private const float ReachMeters = (float)Zax.ReachUnits * Bridge.U2M;

    public override void _Ready()
    {
        var shape = new CollisionShape3D { Shape = new CapsuleShape3D { Radius = 0.32f, Height = 1.7f } };
        shape.Position = new Vector3(0, 0.85f, 0);
        AddChild(shape);

        _cam = new Camera3D { Position = new Vector3(0, 1.55f, 0), Fov = 75 };
        AddChild(_cam);

        _ray = new RayCast3D
        {
            TargetPosition = new Vector3(0, 0, -ReachMeters),
            CollideWithAreas = false,
            CollideWithBodies = true,
            CollisionMask = SceneBuilder.LayerWorld | SceneBuilder.LayerInteract
        };
        _cam.AddChild(_ray);

        CollisionLayer = 0;
        CollisionMask = SceneBuilder.LayerWorld;   // items (layer 2 only) never trip the player
        Input.MouseMode = Input.MouseModeEnum.Captured;
    }

    public override void _UnhandledInput(InputEvent e)
    {
        if (e is InputEventMouseMotion m && Input.MouseMode == Input.MouseModeEnum.Captured)
        {
            RotateY(-m.Relative.X * LookSens);
            _pitch = Mathf.Clamp(_pitch - m.Relative.Y * LookSens, -1.4f, 1.4f);
            _cam.Rotation = new Vector3(_pitch, 0, 0);
        }
    }

    public override void _PhysicsProcess(double delta)
    {
        var v = Velocity;
        v.Y -= Gravity * (float)delta;

        var input = Input.GetVector("move_left", "move_right", "move_forward", "move_back");
        var dir = (Transform.Basis * new Vector3(input.X, 0, input.Y)).Normalized();
        v.X = dir.X * Speed;
        v.Z = dir.Z * Speed;
        Velocity = v;
        MoveAndSlide();

        // report position to the runtime so ZAX can gate by reach
        var (fx, fy, fz) = Bridge.ToFnv(GlobalPosition);
        Game.World.ReportPlayerPos(fx, fy, fz);

        UpdatePrompt();

        if (Input.IsActionJustPressed("interact")) TryInteract();
    }

    private void UpdatePrompt()
    {
        var hit = CurrentTarget();
        if (hit is null) { Game.Hud.SetPrompt(""); return; }
        string label = (string)hit.GetMeta("label");
        string kind = (string)hit.GetMeta("interact");
        Game.Hud.SetPrompt(kind switch
        {
            "item" => $"[E]  Take {label}",
            "container" => $"[E]  Open {label}",
            "door" => $"[E]  {label}",
            "actor" => label,
            _ => $"[E]  {label}"
        });
    }

    private Node? CurrentTarget()
    {
        if (!_ray.IsColliding()) return null;
        var obj = _ray.GetCollider() as Node;
        return obj is not null && obj.HasMeta("ref") ? obj : null;
    }

    private void TryInteract()
    {
        var hit = CurrentTarget();
        if (hit is null) return;
        string r = (string)hit.GetMeta("ref");
        string kind = (string)hit.GetMeta("interact");

        switch (kind)
        {
            case "item":
                Game.SubmitPickUp(r, hit as Node3D);
                break;
            case "container":
                Game.OpenContainer(r);
                break;
            case "door":
                Game.Hud.Say("The door is barred. Doc says you're not ready to leave yet.");
                break;
            case "actor":
                Game.Hud.Say("Doc Mitchell looks you over. \"Easy now — you've been out cold.\" (Dialogue is the Overseer's job. Next milestone.)");
                break;
        }
    }
}
