using Godot;

namespace RobCoGodot;

/// <summary>
/// v0.1.5 DEMO — workflow test, NOT the real v0.2 NPC schedule system.
///
/// Doc loops between REAL positions, each resolved from an actual FalloutNV.esm
/// PACK (package) record's PLDT target reference. Nothing here is invented geometry.
///
/// VERIFIED from the binary (decoded directly, not inferred from names):
///   - All 9 of Doc's packages have PSDT month/day/date/time = -1 (unconditional).
///     Doc has NO clock-time schedule. His movement is quest-stage choreography.
///   - The 6 waypoints below are genuine placed references inside GSDocMitchellHouse,
///     resolved via each package's PLDT target formid.
///
/// INFERRED, not independently verified:
///   - The ORDER below, taken from package EDID naming + tutorial narrative logic.
///     Confirming the true fire order would require decoding the CGTutorial quest's
///     stage script — out of scope for this test.
///
/// This class is Godot-side ONLY. It submits no Command, touches no ZAX gate,
/// writes nothing to the Vault. Doc's position here is presentation, not simulation
/// truth. The real v0.2 system — NPCs authoring commands through the same
/// Command→ZAX→World→Event path as the player, with time as a logged command —
/// is a separate, deliberate design task. See robco-runtime-architecture-v0.1.md §8.
///
/// Caveat for that future design conversation: Doc is a StaticBody3D repositioned
/// every frame. Fine for one NPC in a small cell; re-evaluate (CharacterBody3D /
/// AnimatableBody3D) before this pattern scales to a full cast — this is exactly
/// the scalability question flagged for the v0.2 stress test.
/// </summary>
public partial class DocWalkDemo : Node
{
    private readonly record struct Waypoint(string Label, string SourcePackage, Vector3 FnvPos, float DwellSeconds);

    // pos = real FNV coordinates resolved from each package's PLDT target reference
    private readonly Waypoint[] _route =
    {
        new("Chair (start)",   "VCG01DocMitchellFirstPosition",          new Vector3(2287.964f, 2267.86f,  7385.717f), 3f),
        new("Bedside",         "VCG01DocMitchellBedsideStandingPackage", new Vector3(2243.045f, 2276.269f, 7360f),     3f),
        new("Exam chair",      "VCG01DocMitchellTravelToExamSpot",       new Vector3(1171.554f, 1971.126f, 7398.354f), 3f),
        new("Skull test spot", "VCG01DocMitchellTravelToSkullTestSpot",  new Vector3(1450.98f,  2044.614f, 7360f),     3f),
        new("Vigor Tester",    "VCG01DocMitchellTravelToPlayerAtTester", new Vector3(1964.892f, 1789.831f, 7360f),     3f),
        new("Door (farewell)", "VCG01DocMitchellFarewellDialogueStart",  new Vector3(2310.207f, 1654.801f, 7360f),     3f),
    };

    private const float WalkSeconds = 2.5f;
    private enum Phase { Dwelling, Walking }

    private Node3D _doc = null!;
    private int _index;
    private float _dwell;
    private Vector3 _from, _to;
    private float _t;
    private Phase _phase = Phase.Dwelling;

    public override void _Ready()
    {
        _doc = GetParent().GetNode<Node3D>("Actor_DocMitchell");
        _to = ToWorld(_route[0].FnvPos);
        _doc.Position = _to;
        _dwell = _route[0].DwellSeconds;
        GD.Print($"[DocWalkDemo] starting loop, {_route.Length} real waypoints, no clock-time in source data");
    }

    public override void _Process(double delta)
    {
        float dt = (float)delta;
        if (_phase == Phase.Dwelling)
        {
            _dwell -= dt;
            if (_dwell <= 0f) StartWalkToNext();
            return;
        }

        _t += dt / WalkSeconds;
        _doc.Position = _from.Lerp(_to, Mathf.Clamp(_t, 0f, 1f));
        if (_t >= 1f)
        {
            _phase = Phase.Dwelling;
            _dwell = _route[_index].DwellSeconds;
        }
    }

    private void StartWalkToNext()
    {
        _index = (_index + 1) % _route.Length;
        var wp = _route[_index];
        _from = _doc.Position;
        _to = ToWorld(wp.FnvPos);
        _t = 0f;
        _phase = Phase.Walking;
        GD.Print($"[DocWalkDemo] walking to '{wp.Label}'  (source package: {wp.SourcePackage})");
    }

    private static Vector3 ToWorld(Vector3 fnvPos) =>
        Bridge.ToGodot(fnvPos.X, fnvPos.Y, fnvPos.Z) + new Vector3(0, 0.95f, 0);
}
