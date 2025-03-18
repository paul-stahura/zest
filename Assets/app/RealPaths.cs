using UnityEngine;

public class RealPaths : MonoBehaviour
{
    // the intersection of bpForward and bpSymmetry = rhombus
    public static Vector2 GetBPForward(double real, double index)
    {
        (Vector2 p1, Vector2 p2) = BisectorPoint.BisectorLink(real, index);
        var link = p2 - p1;
        return p1 + link * (float)BisectorPoint.Djoint(index);
    }

    // when bpForward and bpInverse are opposites (bpF.x == -bpI.x && bpF.y == -bpI.y), we have a zero!
    public static Vector2 GetBPInverse(double real, double index)
    {
        (Vector2 p1, Vector2 p2) = NewRiemmanSeigalFormulaSums.InverseBisectorLink(real, index);
        var link = p2 - p1;
        return p1 + link * (float)BisectorPoint.Djoint(index);
    }

    public static Vector2 GetBPSymmetry(double real, double index)
    {
        Zeta.Spiral ems = new Zeta.Spiral(real, index, SpiralFormulas.EulerMaclauren, false);
        return BisectingLines.CrotchPoint(ems);
    }
}
