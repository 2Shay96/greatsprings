using Godot;
using RobCo.Runtime;
using System.Linq;

namespace RobCoGodot;

/// <summary>
/// HUD + Pip-Boy. Pure view: renders runtime state, submits commands, prints verdicts.
/// If ZAX says no, the player sees exactly which gate said no and why.
/// </summary>
public partial class PipBoy : CanvasLayer
{
    public Game Game = null!;

    private static readonly Color Green = new(0.35f, 1.0f, 0.45f);
    private static readonly Color DimGreen = new(0.2f, 0.55f, 0.28f);
    private static readonly Color Amber = new(1.0f, 0.75f, 0.2f);

    private Label _prompt = null!;
    private Label _message = null!;
    private double _messageAge;

    private PanelContainer _pip = null!;
    private Label _stats = null!;
    private ItemList _list = null!;
    private Label _detail = null!;
    private Button _useBtn = null!, _equipBtn = null!, _dropBtn = null!;
    private string[] _listDefIds = System.Array.Empty<string>();

    private PanelContainer _lootPanel = null!;
    private Label _lootTitle = null!;
    private ItemList _lootList = null!;
    private string _lootRef = "";

    public bool AnyPanelOpen => _pip.Visible || _lootPanel.Visible;

    public override void _Ready()
    {
        ProcessMode = ProcessModeEnum.Always;

        // crosshair
        var cross = new Label { Text = "·" };
        cross.AddThemeFontSizeOverride("font_size", 28);
        cross.AddThemeColorOverride("font_color", Green);
        cross.SetAnchorsPreset(Control.LayoutPreset.Center);
        AddChild(cross);

        // interact prompt
        _prompt = new Label { HorizontalAlignment = HorizontalAlignment.Center };
        _prompt.AddThemeFontSizeOverride("font_size", 18);
        _prompt.AddThemeColorOverride("font_color", Green);
        _prompt.SetAnchorsPreset(Control.LayoutPreset.CenterBottom);
        _prompt.Position += new Vector2(0, -120);
        AddChild(_prompt);

        // message line (ZAX verdicts, flavour)
        _message = new Label { HorizontalAlignment = HorizontalAlignment.Center };
        _message.AddThemeFontSizeOverride("font_size", 16);
        _message.AddThemeColorOverride("font_color", Amber);
        _message.SetAnchorsPreset(Control.LayoutPreset.CenterBottom);
        _message.Position += new Vector2(0, -80);
        AddChild(_message);

        BuildPipPanel();
        BuildLootPanel();
    }

    public override void _Process(double delta)
    {
        _messageAge += delta;
        if (_messageAge > 4.0) _message.Text = "";

        if (Input.IsActionJustPressed("pipboy"))
        {
            if (_lootPanel.Visible) CloseLoot();
            else if (_pip.Visible) ClosePip();
            else OpenPip();
        }
        if (Input.IsActionJustPressed("ui_cancel"))
        {
            if (_lootPanel.Visible) CloseLoot();
            else if (_pip.Visible) ClosePip();
            else Input.MouseMode = Input.MouseMode == Input.MouseModeEnum.Captured
                ? Input.MouseModeEnum.Visible : Input.MouseModeEnum.Captured;
        }
        if (Input.IsActionJustPressed("quicksave")) Game.QuickSave();
        if (Input.IsActionJustPressed("quickload")) Game.QuickLoad();
    }

    public void SetPrompt(string t) => _prompt.Text = t;

    public void Say(string t) { _message.Text = t; _messageAge = 0; }

    public void ShowVerdict(Verdict v, string didWhat)
    {
        if (v.Ok) Say(didWhat);
        else Say($"ZAX: {v.FailedGate.ToString().ToUpperInvariant()} — {v.Reason}");
    }

    // ---------------- Pip-Boy ----------------
    private void BuildPipPanel()
    {
        _pip = new PanelContainer { Visible = false };
        _pip.SetAnchorsPreset(Control.LayoutPreset.Center);
        _pip.CustomMinimumSize = new Vector2(640, 460);
        var style = new StyleBoxFlat
        {
            BgColor = new Color(0.02f, 0.05f, 0.02f, 0.96f),
            BorderColor = DimGreen,
            ContentMarginLeft = 16, ContentMarginRight = 16, ContentMarginTop = 12, ContentMarginBottom = 12
        };
        style.SetBorderWidthAll(2);
        _pip.AddThemeStyleboxOverride("panel", style);
        AddChild(_pip);

        var v = new VBoxContainer();
        _pip.AddChild(v);

        var title = new Label { Text = "PIP-BOY 3000  ▸  ITEMS" };
        title.AddThemeFontSizeOverride("font_size", 20);
        title.AddThemeColorOverride("font_color", Green);
        v.AddChild(title);

        _stats = new Label();
        _stats.AddThemeColorOverride("font_color", DimGreen);
        v.AddChild(_stats);

        _list = new ItemList { CustomMinimumSize = new Vector2(0, 260), SizeFlagsVertical = Control.SizeFlags.ExpandFill };
        _list.AddThemeColorOverride("font_color", Green);
        _list.ItemSelected += _ => RefreshDetail();
        v.AddChild(_list);

        _detail = new Label();
        _detail.AddThemeColorOverride("font_color", DimGreen);
        v.AddChild(_detail);

        var row = new HBoxContainer();
        v.AddChild(row);
        _useBtn = MakeButton("USE", () => WithSelected(id => Game.SubmitUse(id)));
        _equipBtn = MakeButton("EQUIP / UNEQUIP", () => WithSelected(id => Game.SubmitEquipToggle(id)));
        _dropBtn = MakeButton("DROP", () => WithSelected(id => Game.SubmitDrop(id)));
        row.AddChild(_useBtn); row.AddChild(_equipBtn); row.AddChild(_dropBtn);

        var hint = new Label { Text = "TAB close   ·   F5 save Vault   ·   F9 replay Vault" };
        hint.AddThemeColorOverride("font_color", DimGreen);
        v.AddChild(hint);
    }

    private Button MakeButton(string text, System.Action onPress)
    {
        var b = new Button { Text = text, SizeFlagsHorizontal = Control.SizeFlags.ExpandFill };
        b.AddThemeColorOverride("font_color", Green);
        b.Pressed += onPress;
        return b;
    }

    private void WithSelected(System.Action<string> act)
    {
        var sel = _list.GetSelectedItems();
        if (sel.Length == 0 || sel[0] >= _listDefIds.Length) return;
        act(_listDefIds[sel[0]]);
        RefreshPip();
    }

    private void OpenPip()
    {
        _pip.Visible = true;
        GetTree().Paused = true;
        Input.MouseMode = Input.MouseModeEnum.Visible;
        RefreshPip();
    }

    private void ClosePip()
    {
        _pip.Visible = false;
        GetTree().Paused = false;
        Input.MouseMode = Input.MouseModeEnum.Captured;
    }

    public void RefreshPip()
    {
        var w = Game.World;
        var p = w.Player;
        _stats.Text = $"HP {p.CurrentHealth}/{p.MaxHealth} (derived: 95 + END×20 + LVL×5)    " +
                      $"WG {w.CarriedWeight(p):0.0}/{p.CarryCapacity:0}    LVL {p.Level}";
        _list.Clear();
        _listDefIds = p.Inventory.Select(s => s.DefId).ToArray();
        foreach (var s in p.Inventory)
        {
            var d = w.GetDefinition(s.DefId)!;
            string tag = d.Id == p.EquippedWeapon ? "  [WEAPON]" : d.Id == p.EquippedArmor ? "  [WORN]" : "";
            _list.AddItem($"{d.Name ?? d.Edid}  x{s.Count}{tag}");
        }
        RefreshDetail();
    }

    private void RefreshDetail()
    {
        var sel = _list.GetSelectedItems();
        if (sel.Length == 0 || sel[0] >= _listDefIds.Length) { _detail.Text = "—"; return; }
        var d = Game.World.GetDefinition(_listDefIds[sel[0]])!;
        string cls = d.ItemClass.ToString().ToUpperInvariant();
        string extra = d.ItemClass == ItemClass.Consumable
            ? (d.IsMedicine ? "MEDICINE (+30 HP)" : d.IsFood ? "FOOD (+5 HP)" : "CHEM")
            : d.ItemClass == ItemClass.Armor ? $"DT {d.DamageThreshold:0.#}" : "";
        _detail.Text = $"{d.Edid}   {cls}   VAL {d.Value}   WG {d.Weight:0.##}   {extra}";
    }

    // ---------------- container loot panel ----------------
    private void BuildLootPanel()
    {
        _lootPanel = new PanelContainer { Visible = false };
        _lootPanel.SetAnchorsPreset(Control.LayoutPreset.Center);
        _lootPanel.CustomMinimumSize = new Vector2(480, 340);
        var style = new StyleBoxFlat
        {
            BgColor = new Color(0.05f, 0.04f, 0.01f, 0.96f),
            BorderColor = Amber,
            ContentMarginLeft = 16, ContentMarginRight = 16, ContentMarginTop = 12, ContentMarginBottom = 12
        };
        style.SetBorderWidthAll(2);
        _lootPanel.AddThemeStyleboxOverride("panel", style);
        AddChild(_lootPanel);

        var v = new VBoxContainer();
        _lootPanel.AddChild(v);
        _lootTitle = new Label();
        _lootTitle.AddThemeFontSizeOverride("font_size", 18);
        _lootTitle.AddThemeColorOverride("font_color", Amber);
        v.AddChild(_lootTitle);

        _lootList = new ItemList { CustomMinimumSize = new Vector2(0, 200), SizeFlagsVertical = Control.SizeFlags.ExpandFill };
        _lootList.AddThemeColorOverride("font_color", Amber);
        v.AddChild(_lootList);

        var row = new HBoxContainer();
        v.AddChild(row);
        var takeAll = new Button { Text = "TAKE ALL", SizeFlagsHorizontal = Control.SizeFlags.ExpandFill };
        takeAll.AddThemeColorOverride("font_color", Amber);
        takeAll.Pressed += () => { Game.SubmitTakeAll(_lootRef); RefreshLoot(); };
        var close = new Button { Text = "CLOSE", SizeFlagsHorizontal = Control.SizeFlags.ExpandFill };
        close.AddThemeColorOverride("font_color", Amber);
        close.Pressed += CloseLoot;
        row.AddChild(takeAll); row.AddChild(close);
    }

    public void OpenLoot(string containerRef)
    {
        _lootRef = containerRef;
        _lootPanel.Visible = true;
        GetTree().Paused = true;
        Input.MouseMode = Input.MouseModeEnum.Visible;
        RefreshLoot();
    }

    private void RefreshLoot()
    {
        var inst = Game.World.GetInstance(_lootRef);
        if (inst is null) { CloseLoot(); return; }
        var def = Game.World.GetDefinition(inst.DefId)!;
        _lootTitle.Text = (def.Name ?? def.Edid ?? "CONTAINER").ToUpperInvariant();
        _lootList.Clear();
        if (inst.Contents.Count == 0) _lootList.AddItem("(empty)");
        foreach (var s in inst.Contents)
        {
            var d = Game.World.GetDefinition(s.DefId);
            _lootList.AddItem($"{d?.Name ?? d?.Edid ?? s.DefId}  x{s.Count}");
        }
    }

    private void CloseLoot()
    {
        _lootPanel.Visible = false;
        GetTree().Paused = false;
        Input.MouseMode = Input.MouseModeEnum.Captured;
    }
}
