using System.Text.Json;

namespace RobCo.Runtime;

/// <summary>
/// A save is not a snapshot. It is the seed plus the command history — the Vault.
/// Loading replays every command through ZAX against fresh content.
/// Replay identity is the definition of done.
/// </summary>
public static class SaveGame
{
    private sealed record SaveDto(ulong Seed, List<CmdDto> Commands);
    private sealed record CmdDto(string Verb, string ActorId, string A, string B, int N);

    public static string Save(World w)
    {
        var cmds = new List<CmdDto>();
        foreach (var ev in w.Log.Where(e => e.Ok))
        {
            // reconstruct command args from the log detail (stored losslessly by World.Describe)
            switch (ev.Verb)
            {
                case "pick_up": cmds.Add(new(ev.Verb, ev.ActorId, ev.Detail, "", 0)); break;
                case "drop": case "use": case "equip": case "unequip":
                    cmds.Add(new(ev.Verb, ev.ActorId, ev.Detail, "", 0)); break;
                case "take_all": cmds.Add(new(ev.Verb, ev.ActorId, ev.Detail, "", 0)); break;
                case "suffer_damage": cmds.Add(new(ev.Verb, ev.ActorId, "", "", int.Parse(ev.Detail))); break;
                case "take_from_container":
                {
                    var parts = ev.Detail.Split(':');           // ref : defIdxCount
                    var ix = parts[1].LastIndexOf('x');
                    cmds.Add(new(ev.Verb, ev.ActorId, parts[0], parts[1][..ix], int.Parse(parts[1][(ix+1)..])));
                    break;
                }
            }
        }
        return JsonSerializer.Serialize(new SaveDto(w.Seed, cmds));
    }

    public static World Load(string sceneJson, string saveJson)
    {
        var dto = JsonSerializer.Deserialize<SaveDto>(saveJson)!;
        var w = ContentLoader.LoadScene(sceneJson, dto.Seed);
        // Replay needs reach checks to pass regardless of live player position:
        // teleport-report the player to each target before re-executing. Honest and explicit.
        foreach (var c in dto.Commands)
        {
            Command cmd = c.Verb switch
            {
                "pick_up" => new PickUp(c.ActorId, c.A),
                "drop" => new DropItem(c.ActorId, c.A),
                "use" => new UseItem(c.ActorId, c.A),
                "equip" => new EquipItem(c.ActorId, c.A),
                "unequip" => new UnequipItem(c.ActorId, c.A),
                "take_all" => new TakeAll(c.ActorId, c.A),
                "take_from_container" => new TakeFromContainer(c.ActorId, c.A, c.B, c.N),
                "suffer_damage" => new SufferDamage(c.ActorId, c.N),
                _ => throw new InvalidOperationException($"unknown verb '{c.Verb}' in save")
            };
            if (cmd is PickUp pu && w.GetInstance(pu.Ref) is { } i1)
                w.ReportPlayerPos(i1.Pos[0], i1.Pos[1], i1.Pos[2]);
            if (cmd is TakeAll ta && w.GetInstance(ta.Ref) is { } i2)
                w.ReportPlayerPos(i2.Pos[0], i2.Pos[1], i2.Pos[2]);
            if (cmd is TakeFromContainer tf && w.GetInstance(tf.Ref) is { } i3)
                w.ReportPlayerPos(i3.Pos[0], i3.Pos[1], i3.Pos[2]);
            var v = w.Execute(cmd);
            if (!v.Ok) throw new InvalidOperationException($"replay diverged: {c.Verb} {c.A} → {v.Reason}");
        }
        return w;
    }
}
