using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.UI;
using Shapes;


public class ZetaAngleSorted : MonoBehaviour
{
    public App app;
    public Color color = new Color(255,179,0,1);

    public float thickness = 1;

    public Slider transparency;

    void OnApplicationQuit()
    {
        savePlayerPrefs();
    }

    void Start()
    {
        transparency.value = PlayerPrefs.GetFloat(name + "-Transparency", color.a);
        app.DrawSprial += drawShapes;
        app.SceneChange += savePlayerPrefs;
    }

    void savePlayerPrefs() 
    {
        PlayerPrefs.SetFloat(name + "-Transparency", transparency.value);
        PlayerPrefs.Save();
    }

    void drawShapes(Camera cam, Zeta.Spiral spiral)
    {
        if (spiral.joints[0] == null)
            return;

        var joints = new Vector[spiral.joints.Length];
        Array.Copy(spiral.joints, joints, spiral.joints.Length);

        // create a struct that contains an index and an angle
        var jointAngles = new List<(int index, double angle)>();

        // normalize the joints around the origin
        for (var i = 1; i < joints.Length; i++)
        {
            joints[i] = joints[i] - spiral.joints[i - 1];
        }

        // get the angle of each joint relative to the previous join
        // these will be in the range of -pi to pi
        for (int i = 1; i < joints.Length; i++)
        {
            // var angle = Math.Atan2(joints[i].y - joints[i - 1].y, joints[i].x - joints[i - 1].x);
            var angle = Math.Atan2(joints[i].y, joints[i].x);
            if (angle < 0)
                angle += Math.PI * 2;
            jointAngles.Add((i, angle));
        }

        // sort jointAngles by angle
        jointAngles = jointAngles.OrderBy(j => j.angle).ToList();

        Draw.Thickness = thickness;

        // Since our links are zero-based, the middle index into the array
        // is not the middle link number starting from one.
        var middleLink = spiral.middleIndex + 1;

        // get the length of the middle link
        // var middleLinkLength = Vector.Distance(spiral.joints[middleLink - 1], spiral.joints[middleLink]);

        // find the joint that has the same length as the middle link
        // var middleLinkJoint = joints.ToList().IndexOf(joints.Where(j => Vector.Distance(joints[middleLink - 1], j) == middleLinkLength).First());

        var start = new Vector2();  //joints[jointAngles[startIndex - 1].index];
        for (int i = 0; i < jointAngles.Count; i++)
        {
            color.a = transparency.value;
            Draw.Thickness = 1 + transparency.value;

            var end = joints[jointAngles[i].index];

            Draw.Line(start, start + end, color);
            start = start + end;
        }
    }
}
