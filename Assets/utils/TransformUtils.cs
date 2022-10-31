using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public static class TransformUtils
{
    public static void Clear(this Transform transform)
    {
        foreach (Transform child in transform)
        {
            GameObject.Destroy(child.gameObject);
        }

        // Procedural meshes don't seem to be destroyed by destroying
        // the parent game object.  This seems to do the trick:
        // Resources.UnloadUnusedAssets();
    }
}
