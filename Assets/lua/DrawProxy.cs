using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Shapes;
using MoonSharp.Interpreter;

[MoonSharpUserData]
public class DrawProxy
{
    public static void line(DynValue from, DynValue to)
    {
        // I don't think this will work as is because of the delay 
        // between when this is called and when the Shapes library actually draws
        Debug.Log("line!");
    }

    // public static Vector2 AsVector2(Table tbl)
    // {
    //     return new Vector2(tbl.)
    // }
}
