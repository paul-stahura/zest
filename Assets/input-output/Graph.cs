using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Shapes;

public class Graph : MonoBehaviour
{
    Color mainGridColor = Color.white;
    Color gridColor = Color.grey;

    public float gridSize = 1f;

    public float zoomFactor;

    public void OnDrawShapes(Camera cam)
    {
        // Get the width and height of the camera's view frustum in world units
        float height = cam.orthographicSize * 2;
        float width = height * cam.aspect;
        var center = cam.transform.position;
        var topLeft = center + new Vector3(-width / 2f, height / 2f, 0f);
        var bottomRight = center + new Vector3(width / 2f, -height / 2f, 0f);

        using (Draw.StyleScope)
        {
            // Draw the main grid
            Draw.Thickness = 1;
            // Draw.Color = mainGridColor;
            // for (float x = 0; x < bottomRight.x; x += gridSize)
            // {
            //     Draw.Line(new Vector3(x, topLeft.y, 0), new Vector3(x, bottomRight.y, 0));
            // }
            // for (float y = 0; y < topLeft.y; y += gridSize)
            // {
            //     Draw.Line(new Vector3(topLeft.x, y, 0), new Vector3(bottomRight.x, y, 0));
            // }

            Draw.Line(Vector2.zero, new Vector2(center.x + width, 0), mainGridColor);
            Draw.Line(Vector2.zero, new Vector2(0, center.y + height), mainGridColor);

            // Draw the sub grid
            Draw.Thickness = .5f;
            Draw.Color = gridColor;
            Draw.Line(new Vector2(.5f, 0), new Vector2(.5f, center.y + height), gridColor);
            // for (float x = 0; x < bottomRight.x; x += gridSize)
            // {
            //     Draw.Line(new Vector3(x, topLeft.y, 0), new Vector3(x, bottomRight.y, 0));
            // }
            // for (float y = 0; y < topLeft.y; y += gridSize / 10)
            // {
            //     Draw.Line(new Vector3(topLeft.x, y, 0), new Vector3(bottomRight.x, y, 0));
            // }
        }
    }
}
