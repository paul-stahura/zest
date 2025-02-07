using System.Collections.Generic;
using System.IO;
using Shapes;
using TMPro;
using UnityEngine;

public class LinkSort : MonoBehaviour
{
    private TMP_Dropdown _linkSortDropdown;
    public enum LinkSortType
    {
        None,
        Atan2,
        AngleFromOrigin
    }

    private LinkSortType _sortType = LinkSortType.None;
    [SerializeField] public LinkSortType linkSortType
    {
        get => _sortType;
        set
        {
            if (_sortType != value)
            {
                _sortType = value;
                _reSortFlag = true;
            }
        }
    }

    [Header("Colors")]
    public Color LinkColor = Color.blue;
    public float LinkTransparency = 0.5f;

    private List<(Vector2, float)> _linkAngles;

    private App _app;
    private bool _reSortFlag = true;

    void Awake() {
        _app = GameObject.FindObjectOfType<App>();
    }

    public void Start()
    {
        _linkSortDropdown = GameObject.Find("LinkSortDrop").GetComponent<TMP_Dropdown>();
        _linkSortDropdown.onValueChanged.AddListener((int v) => linkSortType = (LinkSortType)v);

        _app.DrawSprial += DrawSortedLinks;
        _app.IndexChanged += OnIndexChanged;
    }

    private void OnIndexChanged(double obj)
    {
        _reSortFlag = true;
    }

    private void DrawSortedLinks(Camera cam, Zeta.Spiral spiral)
    {
        switch (_sortType)
        {
            case LinkSortType.Atan2:
                DrawSortedLinksByAtan2(spiral);
                break;
            case LinkSortType.AngleFromOrigin:
                DrawSortedLinksByAngleFromOrigin(spiral);
                break;
            default:
                break;
        }

        _reSortFlag = false;
    }

    private void DrawSortedLinksByAtan2(Zeta.Spiral spiral)
    {
        // sort
        if(_reSortFlag)
        {
            // create a list of ( angle, spiral.joints[index].length ) pairs
            _linkAngles = new List<(Vector2, float)>();

            // always make start??
            _linkAngles.Add((spiral.joints[1] - spiral.joints[0], 10));

            // print(Mathf.Atan2((float)(spiral.joints[1] - spiral.joints[0]).y, (float)(spiral.joints[1] - spiral.joints[0]).x));

            //stop at middle index
            for (int i = 1; i < spiral.middleIndex; i++)
            {
                
                Vector2 b = spiral.joints[i + 1] - spiral.joints[i];

                float angle = Mathf.Atan2(b.y, b.x);

                _linkAngles.Add((b, angle));
            }

            Vector2 bp = BisectorPoint.BpOneHalf(spiral.index) - spiral.joints[spiral.middleIndex];
            float bpAngle = Mathf.Atan2(bp.y, bp.x);

            _linkAngles.Add((bp, bpAngle));

            // sort the list by angle
            _linkAngles.Sort((a, b) => a.Item2.CompareTo(b.Item2));
        }

        // draw the links in the sorted order
        using (Draw.StyleScope)
        {
            var color = LinkColor;
            color.a = LinkTransparency;
            Draw.Thickness = 1 + LinkTransparency;

            Vector2 start = Vector2.zero;
            // for (int i = 0; i < _linkAngles.Count; i++)
            // most angle to least?
            for (int i = _linkAngles.Count - 1; i >= 0; i--)
            {
                Draw.Line(start, start + _linkAngles[i].Item1, color);
                start += _linkAngles[i].Item1;
            }
        }
    }

    // bad but interesting result
    private void DrawSortedLinksByAngleFromOrigin(Zeta.Spiral spiral)
    {
        // create a list of ( angle, spiral.joints[index].length ) pairs
        List<(float, float)> links = new List<(float, float)>();

        float totalAngle = 0;
        for (int i = 1; i < spiral.joints.Length; i++)
        {
            totalAngle += Vector3.Angle(spiral.joints[i - 1], spiral.joints[i]);
            float angle = totalAngle;
            float mag = (float)(spiral.joints[i] - spiral.joints[i - 1]).Length;
            links.Add((angle, mag));
        }

        // sort the list by angle
        links.Sort((a, b) => a.Item1.CompareTo(b.Item1));

        // draw the links in the sorted order
        using (Draw.StyleScope)
        {
            var color = LinkColor;
            color.a = LinkTransparency;
            Draw.Thickness = 1 + LinkTransparency;

            Vector start = new Vector(0, 0);
            for (int i = 0; i < links.Count - 1; i++)
            {
                // for each link create a vector from the angle and magnitude and add it to the start
                Vector end = start + RotateVector(new Vector((float)links[i].Item2, 0), links[i].Item1);
                Draw.Line(start, end, color);
                start = end;
            }
        }
    }

    private Vector RotateVector(Vector vector, float angle)
    {
        float rad = angle * Mathf.Deg2Rad;
        float cos = Mathf.Cos(rad);
        float sin = Mathf.Sin(rad);
        double newX = vector.x * cos - vector.y * sin;
        double newY = vector.x * sin + vector.y * cos;
        return new Vector(newX, newY);
    }
}
