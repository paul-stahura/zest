using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Shapes;

public class Graph : MonoBehaviour
{
    Color mainGridColor = Color.white;
    Color gridColor = Color.grey;

    public float minZoom = 1f;
    public float maxZoom = 5f;

    public float gridSize = 1f;
    public float gridDensity = 10f;
    public float currentGridSize;

    public float currentZoom;
    public float zoomFactor;

    public int lineCountX;
    public int lineCountY;

    public void OnDrawShapes(Camera cam)
    {
        // Get the width and height of the camera's view frustum in world units
        float height = cam.orthographicSize * 2;
        float width = height * cam.aspect;
        var center = cam.transform.position;
        var topLeft = center + new Vector3(-width / 2f, height / 2f, 0f);
        var bottomRight = center + new Vector3(width / 2f, -height / 2f, 0f);

        currentZoom = cam.orthographicSize / maxZoom;
        zoomFactor = Mathf.Lerp(minZoom, maxZoom, currentZoom);

        currentGridSize = gridSize * zoomFactor;

        // Calculate the number of lines in each axis
        lineCountX = Mathf.CeilToInt(cam.orthographicSize * cam.aspect / currentGridSize);
        lineCountY = Mathf.CeilToInt(cam.orthographicSize / currentGridSize);

        // Draw the grid lines
        for (int x = -lineCountX; x <= lineCountX; x++)
        {
            for (int y = -lineCountY; y <= lineCountY; y++)
            {
                float xPos = x * currentGridSize;
                float yPos = y * currentGridSize;
                bool isMainLine = (x % gridDensity == 0) || (y % gridDensity == 0);

                // Set the line color based on whether it's a main grid line or a subdivision
                Color lineColor = isMainLine ? mainGridColor : gridColor;

                // Calculate the alpha based on the zoom level and grid density
                float alpha = Mathf.Lerp(0f, 1f, (zoomFactor - 1f) / (maxZoom - 1f));
                lineColor.a *= alpha;

                using (Draw.Command(cam))
                {
                    // Draw the horizontal and vertical lines
                    Draw.Line(new Vector3(xPos, -lineCountY * currentGridSize, 0), new Vector3(xPos, lineCountY * currentGridSize, 0), lineColor);
                    Draw.Line(new Vector3(-lineCountX * currentGridSize, yPos, 0), new Vector3(lineCountX * currentGridSize, yPos, 0), lineColor);
                }
            }
        }
    }
}
