using Godot;
using RobCo.Runtime;
using System.Text.Json;

namespace RobCoGodot;

/// <summary>
/// Root node. Owns exactly one RobCo.Runtime.World and is the ONLY place commands
/// are submitted from the frontend. Godot draws; the runtime thinks; the Vault remembers.
/// </summary>
public partial class Game : Node3D
{
	public World World { get; private set; } = null!;
	public PipBoy Hud { get; private set; } = null!;

	private string _sceneJson = "";
	private Player _player = null!;
	private const ulong Seed = 20260703;
	private const string SavePath = "user://vault.json";

	public override void _Ready()
	{
		RegisterInputs();

		using var f = FileAccess.Open("res://data/scene.json", FileAccess.ModeFlags.Read);
		_sceneJson = f.GetAsText();

		World = ContentLoader.LoadScene(_sceneJson, Seed);
		GD.Print($"[RobCo] {World.CellName}: {System.Linq.Enumerable.Count(World.Instances)} instances, seed {Seed}");

		using var doc = JsonDocument.Parse(_sceneJson);
		SceneBuilder.Build(this, World, doc.RootElement);

		Hud = new PipBoy { Game = this };
		AddChild(Hud);

		SpawnPlayer(doc.RootElement);

		// --- ADDED: v0.1.5 workflow test — Doc walks a loop between real ESM-resolved
		// positions. Presentation-only; see DocWalkDemo.cs header for exactly what's
		// verified vs. inferred, and why this is NOT the v0.2 NPC schedule system.
		AddChild(new DocWalkDemo());

		Hud.Say("You wake up in Doc Mitchell's house. TAB = Pip-Boy, E = interact.");
	}

	private void SpawnPlayer(JsonElement root)
	{
		_player = new Player { Game = this };
		var sp = root.GetProperty("spawn");
		var pos = sp.GetProperty("pos");
		_player.Position = Bridge.ToGodot(pos[0].GetDouble(), pos[1].GetDouble(), pos[2].GetDouble() + 4)
						   ;
		_player.Rotation = new Vector3(0, Bridge.YawToGodot(sp.GetProperty("heading").GetDouble()), 0);
		AddChild(_player);
	}

	// ---------- command routing: the only door into the runtime ----------

	public void SubmitPickUp(string refId, Node3D? node)
	{
		var v = World.Execute(new PickUp(World.PlayerId, refId));
		var inst = World.GetInstance(refId);
		var def = inst is null ? null : World.GetDefinition(inst.DefId);
		Hud.ShowVerdict(v, $"Took {def?.Name ?? def?.Edid ?? "it"}.");
		if (v.Ok && node is not null) node.QueueFree();   // view reflects state; it never decides it
	}

	public void SubmitUse(string defId)
	{
		var d = World.GetDefinition(defId);
		var v = World.Execute(new UseItem(World.PlayerId, defId));
		Hud.ShowVerdict(v, $"Used {d?.Name ?? defId}. HP {World.Player.CurrentHealth}/{World.Player.MaxHealth}.");
	}

	public void SubmitEquipToggle(string defId)
	{
		var p = World.Player;
		bool equipped = p.EquippedWeapon == defId || p.EquippedArmor == defId;
		var d = World.GetDefinition(defId);
		Verdict v = equipped
			? World.Execute(new UnequipItem(World.PlayerId, defId))
			: World.Execute(new EquipItem(World.PlayerId, defId));
		Hud.ShowVerdict(v, $"{(equipped ? "Unequipped" : "Equipped")} {d?.Name ?? defId}.");
	}

	public void SubmitDrop(string defId)
	{
		var d = World.GetDefinition(defId);
		var v = World.Execute(new DropItem(World.PlayerId, defId));
		Hud.ShowVerdict(v, $"Dropped {d?.Name ?? defId}. (It's gone — spawning dropped props is a next-milestone task.)");
	}

	public void SubmitTakeAll(string refId)
	{
		var v = World.Execute(new TakeAll(World.PlayerId, refId));
		Hud.ShowVerdict(v, "Took everything.");
		Hud.RefreshPip();
	}

	public void OpenContainer(string refId) => Hud.OpenLoot(refId);

	// ---------- the Vault ----------

	public void QuickSave()
	{
		string save = SaveGame.Save(World);
		using var f = FileAccess.Open(SavePath, FileAccess.ModeFlags.Write);
		f.StoreString(save);
		Hud.Say($"Vault written: seed + {World.Log.Count} events. Hash {World.StateHash():X16}.");
	}

	public void QuickLoad()
	{
		if (!FileAccess.FileExists(SavePath)) { Hud.Say("No Vault on disk."); return; }
		using var f = FileAccess.Open(SavePath, FileAccess.ModeFlags.Read);
		string save = f.GetAsText();

		var replayed = SaveGame.Load(_sceneJson, save);
		World = replayed;
		Hud.Say($"Vault replayed. Hash {World.StateHash():X16} — identical history, identical world.");

		// rebuild the view from replayed truth
		foreach (var child in GetChildren())
			if (child != Hud && child != _player) child.QueueFree();
		using var doc = JsonDocument.Parse(_sceneJson);
		SceneBuilder.Build(this, World, doc.RootElement);
		PruneTaken();
		AddChild(new DocWalkDemo());
		Hud.RefreshPip();
	}

	private void PruneTaken()
	{
		// remove nodes whose instances are Taken in the replayed world
		foreach (var child in GetChildren())
		{
			if (child is Node3D n && n.HasMeta("ref"))
			{
				var inst = World.GetInstance((string)n.GetMeta("ref"));
				if (inst is { Taken: true }) n.QueueFree();
			}
		}
	}

	private static void RegisterInputs()
	{
		AddKey("move_forward", Key.W);
		AddKey("move_back", Key.S);
		AddKey("move_left", Key.A);
		AddKey("move_right", Key.D);
		AddKey("interact", Key.E);
		AddKey("pipboy", Key.Tab);
		AddKey("quicksave", Key.F5);
		AddKey("quickload", Key.F9);
	}

	private static void AddKey(string action, Key key)
	{
		if (InputMap.HasAction(action)) return;
		InputMap.AddAction(action);
		InputMap.ActionAddEvent(action, new InputEventKey { PhysicalKeycode = key });
	}
}
