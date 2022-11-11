using System;
using System.IO;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using Shapes;

public class ZetaClock : ImmediateModeShapeDrawer
{
    public ZetaSpiral zetaSprial;
    public App app;

    public double startImag;

    Dictionary<int, double> zetaTime = new Dictionary<int, double>();
    void OnApplicationQuit()
    {
        if (0 == zetaTime.Count)
            return;

        var num = 1;
        while (File.Exists($"clock-{num}.csv"))
            num++;

        using (StreamWriter sr = File.CreateText($"clock-{num}.csv"))
        {
            foreach (var kv in zetaTime)
                sr.WriteLine($"{kv.Key},{kv.Value}");
        }
    }

    void Start()
    {
        var num = 1;
        while (File.Exists($"clock-{num}.csv"))
            num++;

        num--;
        if (File.Exists($"clock-{num}.csv"))
        {
            using (StreamReader sr = File.OpenText($"clock-{num}.csv"))
            {
                string line = "";
                while ((line = sr.ReadLine()) != null)
                {
                    var tokens = line.Split(new char[] { ',' });
                    startImag = double.Parse(tokens[1]);
                    zetaTime.Add(int.Parse(tokens[0]), startImag);
                }
            }
            Debug.Log("loaded " + zetaTime.Count + " entries");
        }
        // if (startImag != 0)
        //     app.Imag = startImag;
    }

    public int hour;
    public int minute;
    public int second;
    public int hourAngle;
    public int minAngle;
    public int secAngle;

    public float hourDeg;
    public float minDeg;
    public float secDeg;

    void Update()
    {
        var spiral = zetaSprial.S;
        var mi = spiral.middleIndex;

        // second = DateTime.Now.Second;
        // minute = DateTime.Now.Minute;
        // hour = DateTime.Now.Hour;

        // hourAngle = 360 - 30 * hour;
        // if (hourAngle < 0) hourAngle += 360;

        // minAngle = 360 - 6 * minute;
        // if (minAngle < 0) minAngle += 360;

        // secAngle = 360 - 6 * second;
        // if (secAngle < 0) secAngle += 360;

        var hourLink = (spiral.links[mi + 2] - spiral.links[mi + 1]).ToVector2();
        hourDeg = Mathf.Atan2(hourLink.y, hourLink.x) * Mathf.Rad2Deg - 90;
        if (hourDeg < 0) hourDeg += 360;
        hour = (int)(360f - hourDeg / 30f) % 12;

        var minLink = (spiral.links[mi] - spiral.links[mi + 1]).ToVector2();
        minDeg = Mathf.Atan2(minLink.y, minLink.x) * Mathf.Rad2Deg - 90;
        if (minDeg < 0) minDeg += 360;
        minute = (int)(360f - minDeg / 6f) % 60;

        var secLink = (spiral.links[mi - 1] - spiral.links[mi]).ToVector2();
        secDeg = Mathf.Atan2(secLink.y, secLink.x) * Mathf.Rad2Deg - 90;
        if (secDeg < 0) secDeg += 360;
        second = (int)(360f - secDeg / 6f) % 60;

        // hourAngle
        var key = DateTime.UnixEpoch.AddHours(hour);
        key = key.AddMinutes(minute);
        key = key.AddSeconds(second);

        var secSinceEpoch = (int)key.Subtract(DateTime.UnixEpoch).TotalSeconds;
        if (!zetaTime.TryAdd(secSinceEpoch, app.Imag))
        {
            // Debug.Log("duplicate time:" + key + " imag:" + app.Imag);
            duplicate++;
        }
        else
        {
            added++;
            if (added % 100 == 0)
                OnApplicationQuit(); // save

            duplicate = 0;
        }

        if (zetaTime.Count < 43200)
            app.Imag += .0005;

        count = zetaTime.Count;
    }

    public int duplicate = 0;
    public int added;

    public int count;

    public override void DrawShapes(Camera cam)
    {
        var spiral = zetaSprial.S;
        using (Draw.Command(cam))
        {
            using (Draw.StyleScope)
            {
                trackLink(spiral.middleIndex + 1);
            }
        }
    }

    public float RotationOfLink(Zeta.Spiral s, int idx)
    {
        Vector3 start = s.links[idx];
        Vector3 end = s.links[idx + 1];

        var temp = end - start;
        var deg = Mathf.Atan2(temp.y, temp.x) * Mathf.Rad2Deg;

        return deg;
    }

    void trackLink(int idx)
    {
        var s = zetaSprial.S;
        var start = s.links[idx];
        var end = s.links[idx + 1];

        var pos = start; // + (end - start) / 2;
        setCamera(pos, Quaternion.identity);
    }

    /// <summary>
    /// Sets the camera's position to an offset from the Robot3's position. 
    /// Also sets the camera's absolute rotation.
    /// 
    /// The camera's transform can only be updated during the Update() phase, which
    /// is also when Robot3.calc() is called.
    /// </summary>
    /// <param name="pos"></param>
    /// <param name="rot"></param>
    void setCamera(Vector3 pos, Quaternion rot)
    {
        // Make Camera z opposite when tracking is enabled.
        pos = new Vector3(pos.x, pos.y, Camera.main.transform.position.z);


        // Camera.main.transform.rotation = rot;
        Camera.main.transform.position = transform.position + pos;
    }

}