using RobCo.Runtime;

// Headless validation against the REAL exported cell. No mocks. No Godot.
// Physics/math proven here before a single line of frontend exists.

int pass = 0, fail = 0;
void Check(bool cond, string name)
{
    if (cond) { pass++; Console.WriteLine($"  ok   {name}"); }
    else { fail++; Console.WriteLine($"  FAIL {name}"); }
}

string sceneJson = File.ReadAllText(args.Length > 0 ? args[0] : "scene.json");

Console.WriteLine("== load ==");
var w = ContentLoader.LoadScene(sceneJson, seed: 20260703);
Check(w.CellName == "Doc Mitchell's House", "cell name");
Check(w.Instances.Count() > 300, $"instances loaded ({w.Instances.Count()})");
Check(w.Player.CurrentHealth == 200, $"derived health: END5 L1 = 95+100+5 = {w.Player.CurrentHealth}");
Check(Math.Abs(w.Player.CarryCapacity - 200) < 0.001, "carry capacity 150+10*STR = 200");

var stimpakRef = w.Instances.First(i => w.GetDefinition(i.DefId)!.Edid == "Stimpak");
var docRef     = w.Instances.First(i => w.GetDefinition(i.DefId)!.Edid == "DocMitchell");
var fridge     = w.Instances.First(i => w.GetDefinition(i.DefId)!.Edid == "RefrigeratorWithFood");
var wallStat   = w.Instances.FirstOrDefault(i => w.GetDefinition(i.DefId)!.Kind == Kind.Static);

Console.WriteLine("== ZAX gates ==");
// Authority: nonexistent actor
Check(!w.Execute(new PickUp("bud", stimpakRef.Ref)).Ok, "AUTHORITY rejects unknown actor");
// Possibility: out of reach (player at origin, far away)
w.ReportPlayerPos(0, 0, 0);
var far = w.Execute(new PickUp(World.PlayerId, stimpakRef.Ref));
Check(!far.Ok && far.FailedGate == Gate.Possibility, $"POSSIBILITY rejects out-of-reach ({far.Reason})");
// walk over
w.ReportPlayerPos(stimpakRef.Pos[0], stimpakRef.Pos[1], stimpakRef.Pos[2]);
Check(w.Execute(new PickUp(World.PlayerId, stimpakRef.Ref)).Ok, "pick up Stimpak in reach");
Check(stimpakRef.Taken, "instance marked taken");
Check(w.Player.Inventory.Any(s => s.DefId == stimpakRef.DefId), "stimpak in inventory");
// double-take
Check(!w.Execute(new PickUp(World.PlayerId, stimpakRef.Ref)).Ok, "POSSIBILITY rejects double-take");
// statics are not portable
if (wallStat is not null)
{
    w.ReportPlayerPos(wallStat.Pos[0], wallStat.Pos[1], wallStat.Pos[2]);
    var vs = w.Execute(new PickUp(World.PlayerId, wallStat.Ref));
    Check(!vs.Ok && vs.Reason.Contains("not portable"), "POSSIBILITY rejects picking up a Static");
}
// NPCs are not portable either
w.ReportPlayerPos(docRef.Pos[0], docRef.Pos[1], docRef.Pos[2]);
Check(!w.Execute(new PickUp(World.PlayerId, docRef.Ref)).Ok, "cannot pocket Doc Mitchell");

Console.WriteLine("== use / equip ==");
Check(w.Execute(new SufferDamage(World.PlayerId, 50)).Ok, "suffer 50 damage via command (no direct writes, ever)");
Check(w.Player.CurrentHealth == 150, "damage applied, health derived");
Check(!w.Execute(new SufferDamage(World.PlayerId, -5)).Ok, "INTEGRITY rejects negative damage");
Check(w.Execute(new UseItem(World.PlayerId, stimpakRef.DefId)).Ok, "use Stimpak");
Check(w.Player.CurrentHealth == 180, $"stimpak healed 30 → {w.Player.CurrentHealth}");
Check(!w.Player.Inventory.Any(s => s.DefId == stimpakRef.DefId), "stimpak consumed");
Check(!w.Execute(new UseItem(World.PlayerId, stimpakRef.DefId)).Ok, "cannot use what you do not carry");

var knife = w.Instances.First(i => w.GetDefinition(i.DefId)!.Edid == "WeapKnife");
var equipEarly = w.Execute(new EquipItem(World.PlayerId, knife.DefId));
Check(!equipEarly.Ok, "cannot equip weapon before picking it up");
w.ReportPlayerPos(knife.Pos[0], knife.Pos[1], knife.Pos[2]);
w.Execute(new PickUp(World.PlayerId, knife.Ref));
Check(w.Execute(new EquipItem(World.PlayerId, knife.DefId)).Ok, "equip knife");
Check(w.Player.EquippedWeapon == knife.DefId, "knife equipped");
Check(!w.Execute(new UseItem(World.PlayerId, knife.DefId)).Ok, "knife is not consumable");

Console.WriteLine("== containers ==");
w.ReportPlayerPos(fridge.Pos[0], fridge.Pos[1], fridge.Pos[2]);
int before = fridge.Contents.Sum(s => s.Count);
Console.WriteLine($"  fridge rolled {before} items from seed: " +
    string.Join(", ", fridge.Contents.Select(s => $"{w.GetDefinition(s.DefId)?.Name ?? s.DefId} x{s.Count}")));
if (before > 0)
{
    Check(w.Execute(new TakeAll(World.PlayerId, fridge.Ref)).Ok, "take all from fridge");
    Check(fridge.Contents.Count == 0, "fridge emptied");
    Check(fridge.Opened, "fridge marked opened");
}
Check(!w.Execute(new TakeFromContainer(World.PlayerId, fridge.Ref, "00000000", 1)).Ok, "cannot take what is not there");

Console.WriteLine("== determinism: same seed, same world ==");
var w2 = ContentLoader.LoadScene(sceneJson, seed: 20260703);
var w3 = ContentLoader.LoadScene(sceneJson, seed: 20260703);
Check(w2.StateHash() == w3.StateHash(), $"identical init hash: {w2.StateHash():X16}");
var w4 = ContentLoader.LoadScene(sceneJson, seed: 999);
Check(w4.StateHash() != w2.StateHash(), "different seed → different world");

Console.WriteLine("== save / replay identity ==");
string save = SaveGame.Save(w);
var replayed = SaveGame.Load(sceneJson, save);
Check(replayed.StateHash() == w.StateHash(),
      $"replay hash {replayed.StateHash():X16} == live hash {w.StateHash():X16}");
Check(replayed.Player.CurrentHealth == w.Player.CurrentHealth, "replayed health matches");
Check(replayed.Player.EquippedWeapon == w.Player.EquippedWeapon, "replayed equipment matches");

Console.WriteLine($"\n{pass} passed, {fail} failed");
return fail == 0 ? 0 : 1;
