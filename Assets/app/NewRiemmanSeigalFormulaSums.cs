using Shapes;
using UnityEngine;
using System;
using Complex = System.Numerics.Complex;
using UnityEngine.UI;


public class NewRiemmanSeigalFormulaSums : MonoBehaviour
{
    App _app;
    Toggle _DrawToggle;
    Toggle _ReflectToggle;

    void Awake() 
    {
        _app = GameObject.Find("App").GetComponent<App>();
        _app.DrawSprial += drawZrFormula;

        _DrawToggle = GameObject.Find("DrawRSFormulaSums").GetComponent<Toggle>();
        _ReflectToggle = GameObject.Find("RSReflectSumB").GetComponent<Toggle>();
    }
    void drawZrFormula(Camera cam, Zeta.Spiral spiral)
    {
        if(!_DrawToggle.isOn) return;

        Complex s = new Complex(spiral.real, Zeta.IndexToImag(spiral.index));
        int variedN = (int)Math.Sqrt(2 * Math.PI * s.Imaginary);
        int N = variedN; // Number of terms in second sum

        using (Draw.StyleScope)
        {
            Draw.Thickness = 1;

            Complex sum1 = Complex.Zero;
            for (int n = 1; n <= N; n++)
            {
                Complex next = Complex.Pow(n, -s);
                Vector2 start = sum1.ToVector2();
                Vector2 end = (sum1 + next).ToVector2();
                Draw.Line(start, end, Color.magenta);
                sum1 += next;
            }

            var norm = spiral.zeta.ToVector().Normalized();
            var perp = new Vector(-norm.y, norm.x);

            Complex sum2 = Complex.Zero;
            for (int n = 1; n <= N; n++)
            {
                Complex next = Complex.Pow(n, s - 1) * GammaRatio(1-s);
                Vector start = sum2.ToVector();
                Vector end = (sum2 + next).ToVector();
                if(_ReflectToggle.isOn)
                {
                    start = start.Reflect(perp).Reflect(norm) + spiral.zeta.ToVector();
                    end = end.Reflect(perp).Reflect(norm) + spiral.zeta.ToVector();
                }
                Draw.Line(start, end, Color.cyan);
                sum2 += next;
            }

            Draw.Line(Vector2.zero, (sum1 + sum2).ToVector2(), Color.red);
        }
    }

    public static Complex GammaRatio(Complex s)
    {
        // print("pi^(1/2 - s)" + Complex.Pow(Math.PI, 0.5 - s));
        // print("s/2: " + Zeta.complex_gamma(s / 2.0));
        // print("(1-s) / 2: " + Zeta.complex_gamma((1 - s) / 2.0));
        // print("gamma1 / gamma2: " + (Zeta.complex_gamma(s / 2.0) / Zeta.complex_gamma((1 - s) / 2.0)));
        return  Complex.Pow(Math.PI, 0.5 - s) * (Zeta.complex_gamma(s / 2.0) / Zeta.complex_gamma((1 - s) / 2.0));
    }

    public static (Vector2, Vector2) InverseBisectorLink(double real, double index)
    {
        Complex s = new Complex(real, Zeta.IndexToImag(index));
        Complex p1 = new Complex(0, 0);
        int nLimit = (int)Math.Ceiling(index);
        for (int n = 1; n < nLimit; n++)
        {
            p1 += Complex.Pow(n, s - 1) * GammaRatio(1-s);
        }

        Complex p2 = p1;
        p2 += Complex.Pow(nLimit, s - 1) * GammaRatio(1-s);

        return (p1.ToVector2(), p2.ToVector2());
    }
}
