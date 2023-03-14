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

    /// <summary>
    /// Creates a transform from the difference between this one and another.
    /// </summary>
    /// <param name="transform"></param>
    /// <param name="other"></param>
    /// <returns></returns>
    public static Vector3 Difference(this Transform transform, Transform other)
    {
        var pos = other.position - transform.position;
        var rot = other.rotation * Quaternion.Inverse(transform.rotation);

        return pos;
    }

    /// <summary>
    /// Adds another transform's position and rotation to this one.
    /// Use it to apply a calculated difference.
    /// </summary>
    /// <param name="transform"></param>
    /// <param name="other"></param>
    public static void Apply(this Transform transform, Transform other)
    {
        transform.position += other.position;
        transform.rotation = other.rotation * transform.rotation;
    }
}
