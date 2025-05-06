using UnityEngine;

public class RhombusPoints : MonoBehaviour
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

    // intersection of foraward and inverse reflected bisector links
    public static Vector2 GetBPReflectedInverse(double real, double index)
    {
        return SpiralCalculator.InverseReflectedIntersection(real, index);
    }

    public static Vector2 GetZeta(double real, double index)
    {
        Zeta.Spiral ems = new Zeta.Spiral(real, index, SpiralFormulas.EulerMaclauren, false);
        return ems.zeta.ToVector2();
    }

    public static Vector2 GetBPSymmetry(double real, double index)
    {
        Zeta.Spiral ems = new Zeta.Spiral(real, index, SpiralFormulas.EulerMaclauren, false);
        return BisectingLines.CrotchPoint(ems);
    }
}
