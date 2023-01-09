using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public static class MeshUtils
{
    /// <summary>
    /// While scanning, Unity will continuously leak as it doesn't free up
    /// points we use for rendering the scan.  The scanner periodically calls
    /// this method to tell Unity to free up anything not currently used in the
    /// scene.
    /// </summary>
    public static void UnloadUnusedAssets()
    {
        Resources.UnloadUnusedAssets();
    }

    /// <summary>
    /// Takes the passed in points and assigns them to a MeshFilter / Renderer
    /// for point-rendering directly by Unity. If the number of points exceeds
    /// the maximum for a MeshFilter, it creates additional child objects and continues.
    /// </summary>
    /// <param name="parent"></param>
    /// <param name="name"></param>
    /// <param name="points"></param>
    /// <param name="material"></param>
    /// <param name="colors"></param>
    /// <param name="uv"></param>
    /// <returns></returns>
    public static Bounds ChildrenFromPoints(Transform parent, string name, Vector3[] points, Material material, Vector3 scale, Color[] colors = null, Vector2[] uv = null)
    {
        const int MAX_MESH_VERTICIES = 65534;

        var bounds = new Bounds();

        // Debug.LogWarningFormat("[MeshUtils::ChildrenFromPoints] parent:{0} points:{1} colors:{2}", parent, points.Length, colors != null ? colors.Length : 0);
        int meshID = 0;
        int start = 0;
        int len = Mathf.Min(MAX_MESH_VERTICIES, points.Length - start);
        int end = start + len;

        while (len > 0)
        {
            MeshFilter filter;
            MeshRenderer renderer;

            var go = GameObject.Find(name + " Mesh-" + meshID);
            if (go != null)
            {
                // In the case of Zest, when you change the index to a smaller number
                // and therefore reduce the number of spirals, Unity complains
                // about the number of triangles not matching or something
                // along those lines. I couldn't quickly figure it out so
                // for now, I'm just creating new GameObjects every time.
                GameObject.Destroy(go);
            }

            go = new GameObject(name + " Mesh-" + meshID);
            filter = go.AddComponent<MeshFilter>();
            renderer = go.AddComponent<MeshRenderer>();

            go.transform.SetParent(parent, false);
            go.layer = parent.gameObject.layer;
            go.transform.localScale = scale;

            renderer.material = material;

            int[] indeces = new int[len];
            for (int i = 0; i < len; i++)
                indeces[i] = i;

            filter.mesh.vertices = points.Slice<Vector3>(start, end);
            filter.mesh.SetIndices(indeces, MeshTopology.Points, 0);

            if (colors != null)
                filter.mesh.colors = colors.Slice<Color>(start, end);

            if (uv != null)
                filter.mesh.uv = uv.Slice<Vector2>(start, end);

            filter.mesh.RecalculateBounds();
            bounds.Encapsulate(filter.mesh.bounds);

            start = end;
            len = Mathf.Min(MAX_MESH_VERTICIES, points.Length - start);
            end = start + len;
            meshID++;
        }

        return bounds;
        // Debug.LogWarningFormat("Created {0}'s created {1} children", parent.name, meshID);
    }

    public static Bounds QuadsFromPoints(Transform parent, Vector3[] points, Material material, float size, string name = null)
    {
        const int MAX_MESH_QUADS = 16383; // 16,383 * 4 < 65534 max verticies

        var bounds = new Bounds();

        // Debug.LogWarningFormat("[MeshUtils::ChildrenFromPoints] parent:{0} points:{1} colors:{2}", parent, points.Length, colors != null ? colors.Length : 0);
        int meshID = 0;
        int start = 0;
        int len = Mathf.Min(MAX_MESH_QUADS, points.Length - start);
        int end = start + len;

        size /= 2;

        if (String.IsNullOrEmpty(name))
            name = "Quads";

        while (len > 0)
        {
            var go = new GameObject(name + " " + meshID++);
            go.transform.SetParent(parent, true);
            go.layer = parent.gameObject.layer;
            // Debug.LogWarningFormat("Created {0}'s child {1}", parent.name, go.name);

            var filter = go.AddComponent<MeshFilter>();
            var renderer = go.AddComponent<MeshRenderer>();
            renderer.material = material;

            var srcPts = new ArraySlice<Vector3>(points, start, end);
            var v = new Vector3[srcPts.Length * 4];
            var triangles = new int[srcPts.Length * 6];
            var normals = new Vector3[srcPts.Length * 4];
            var uv = new Vector2[srcPts.Length * 4];

            for (int i = 0; i < srcPts.Length; i++)
            {
                var pt = srcPts[i];
                v[i * 4] = new Vector3(pt.x - size, pt.y - size, pt.z);
                v[i * 4 + 1] = new Vector3(pt.x + size, pt.y - size, pt.z);
                v[i * 4 + 2] = new Vector3(pt.x - size, pt.y + size, pt.z);
                v[i * 4 + 3] = new Vector3(pt.x + size, pt.y + size, pt.z);

                // lower left triangle
                triangles[i * 6] = i * 4;
                triangles[i * 6 + 1] = i * 4 + 2;
                triangles[i * 6 + 2] = i * 4 + 1;

                // upper right triangle
                triangles[i * 6 + 3] = i * 4 + 2;
                triangles[i * 6 + 4] = i * 4 + 3;
                triangles[i * 6 + 5] = i * 4 + 1;

                normals[i * 4] = -Vector3.forward;
                normals[i * 4 + 1] = -Vector3.forward;
                normals[i * 4 + 2] = -Vector3.forward;
                normals[i * 4 + 3] = -Vector3.forward;

                uv[i * 4] = new Vector2(0, 0);
                uv[i * 4 + 1] = new Vector2(1, 0);
                uv[i * 4 + 2] = new Vector2(0, 1);
                uv[i * 4 + 3] = new Vector2(1, 1);
            }

            filter.mesh.vertices = v;
            filter.mesh.triangles = triangles;
            filter.mesh.normals = normals;

            filter.mesh.RecalculateBounds();
            bounds.Encapsulate(filter.mesh.bounds);

            start = end;
            len = Mathf.Min(MAX_MESH_QUADS, points.Length - start);
            end = start + len;
        }

        return bounds;
        // Debug.LogWarningFormat("Created {0}'s created {1} children", parent.name, meshID);
    }

    /// <summary>
    /// This script can be used to split a 2D polygon into triangles. The 
    /// algorithm supports concave polygons, but not polygons with holes, or 
    /// multiple polygons at once.
    /// 
    /// Note: This is a naive triangulation implementation. For more 
    /// well-distributed triangles, consider using Delaunay triangulation, such 
    /// as with the script here:
    /// https://github.com/voxelholic/Unity-delaunay
    /// 
    /// Reference: http://wiki.unity3d.com/index.php/Triangulator
    /// </summary>
    public class Triangulator
    {
        private List<Vector2> m_points = new List<Vector2>();

        public Triangulator(Vector2[] points)
        {
            m_points = new List<Vector2>(points);
        }

        public int[] Triangulate()
        {
            List<int> indices = new List<int>();

            int n = m_points.Count;
            if (n < 3)
                return indices.ToArray();

            int[] V = new int[n];
            if (Area() > 0)
            {
                for (int v = 0; v < n; v++)
                    V[v] = v;
            }
            else
            {
                for (int v = 0; v < n; v++)
                    V[v] = (n - 1) - v;
            }

            int nv = n;
            int count = 2 * nv;
            for (int v = nv - 1; nv > 2;)
            {
                if ((count--) <= 0)
                    return indices.ToArray();

                int u = v;
                if (nv <= u)
                    u = 0;
                v = u + 1;
                if (nv <= v)
                    v = 0;
                int w = v + 1;
                if (nv <= w)
                    w = 0;

                if (Snip(u, v, w, nv, V))
                {
                    int a, b, c, s, t;
                    a = V[u];
                    b = V[v];
                    c = V[w];
                    indices.Add(a);
                    indices.Add(b);
                    indices.Add(c);
                    for (s = v, t = v + 1; t < nv; s++, t++)
                        V[s] = V[t];
                    nv--;
                    count = 2 * nv;
                }
            }

            indices.Reverse();
            return indices.ToArray();
        }

        private float Area()
        {
            int n = m_points.Count;
            float A = 0.0f;
            for (int p = n - 1, q = 0; q < n; p = q++)
            {
                Vector2 pval = m_points[p];
                Vector2 qval = m_points[q];
                A += pval.x * qval.y - qval.x * pval.y;
            }
            return (A * 0.5f);
        }

        private bool Snip(int u, int v, int w, int n, int[] V)
        {
            int p;
            Vector2 A = m_points[V[u]];
            Vector2 B = m_points[V[v]];
            Vector2 C = m_points[V[w]];
            if (Mathf.Epsilon > (((B.x - A.x) * (C.y - A.y)) - ((B.y - A.y) * (C.x - A.x))))
                return false;
            for (p = 0; p < n; p++)
            {
                if ((p == u) || (p == v) || (p == w))
                    continue;
                Vector2 P = m_points[V[p]];
                if (InsideTriangle(A, B, C, P))
                    return false;
            }
            return true;
        }

        private bool InsideTriangle(Vector2 A, Vector2 B, Vector2 C, Vector2 P)
        {
            float ax, ay, bx, by, cx, cy, apx, apy, bpx, bpy, cpx, cpy;
            float cCROSSap, bCROSScp, aCROSSbp;

            ax = C.x - B.x;
            ay = C.y - B.y;
            bx = A.x - C.x;
            by = A.y - C.y;
            cx = B.x - A.x;
            cy = B.y - A.y;
            apx = P.x - A.x;
            apy = P.y - A.y;
            bpx = P.x - B.x;
            bpy = P.y - B.y;
            cpx = P.x - C.x;
            cpy = P.y - C.y;

            aCROSSbp = ax * bpy - ay * bpx;
            cCROSSap = cx * apy - cy * apx;
            bCROSScp = bx * cpy - by * cpx;

            return ((aCROSSbp >= 0.0f) && (bCROSScp >= 0.0f) && (cCROSSap >= 0.0f));
        }
    }
}
