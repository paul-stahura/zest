using UnityEngine;
using UnityEngine.UI;
using System.Collections.Generic;

[AddComponentMenu("UI/PointsMeshRenderer")]
[RequireComponent(typeof(CanvasRenderer))]
public class PointsMeshRenderer : MaskableGraphic
{
    // List of point positions in local coordinates
    public List<Vector2> Points = new List<Vector2>();

    // Size of each point (width and height in pixels)
    [SerializeField]
    private float pointSize = 4f;
    public float PointSize
    {
        get { return pointSize; }
        set { pointSize = value; SetVerticesDirty(); }
    }

    // Call this method to refresh the mesh when point data changes
    public void Refresh()
    {
        SetVerticesDirty();
    }

    // Override the mesh generation to create a quad for each point
    protected override void OnPopulateMesh(VertexHelper vh)
    {
        vh.Clear();
        if (Points == null || Points.Count == 0)
            return;

        // Get the rect dimensions
        Rect r = GetPixelAdjustedRect();
        
        float halfSize = pointSize * 0.5f;
        for (int i = 0; i < Points.Count; i++)
        {
            Vector2 center = Points[i];
            
            // Skip points outside the rect bounds with a small buffer (half point size)
            // This optimization reduces the number of vertices for points outside the visible area
            if (center.x + halfSize < r.xMin || center.x - halfSize > r.xMax || 
                center.y + halfSize < r.yMin || center.y - halfSize > r.yMax)
            {
                continue;
            }
            
            // Define the four corners of the quad centered at 'center'
            Vector2 bottomLeft = new Vector2(center.x - halfSize, center.y - halfSize);
            Vector2 topLeft = new Vector2(center.x - halfSize, center.y + halfSize);
            Vector2 topRight = new Vector2(center.x + halfSize, center.y + halfSize);
            Vector2 bottomRight = new Vector2(center.x + halfSize, center.y - halfSize);

            int indexOffset = vh.currentVertCount;
            vh.AddVert(bottomLeft, color, new Vector2(0, 0));
            vh.AddVert(topLeft, color, new Vector2(0, 1));
            vh.AddVert(topRight, color, new Vector2(1, 1));
            vh.AddVert(bottomRight, color, new Vector2(1, 0));

            vh.AddTriangle(indexOffset, indexOffset + 1, indexOffset + 2);
            vh.AddTriangle(indexOffset, indexOffset + 2, indexOffset + 3);
        }
    }

    // Ensure mesh updates when the RectTransform dimensions change
    protected override void OnRectTransformDimensionsChange()
    {
        base.OnRectTransformDimensionsChange();
        SetVerticesDirty();
    }

    public override bool Raycast(Vector2 sp, Camera eventCamera)
    {
        return false;
    }
} 