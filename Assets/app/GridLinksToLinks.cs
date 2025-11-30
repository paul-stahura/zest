using System;
using System.Collections;
using System.Collections.Generic;
using Shapes;
using UnityEngine;
using UnityEngine.UI;

public class GridLinksToLinks : ImmediateModeShapeDrawer
{
    [SerializeField] private Button _clearAllButton;

    // links to spirals
    [SerializeField] private Toggle _forwardLinksToInverseReflectedLinksToggle;
    [SerializeField] private Toggle _inverseLinksToForwardReflectedLinksToggle;
    [SerializeField] private Color _linksToLinksColor;

    // "right" angle links
    [SerializeField] private Toggle _forwardToInverseToggle;
    [SerializeField] private Toggle _forwardReflectedToInverseReflectedToggle;
    [SerializeField] private Color _reflectedLinksColor;

    // links through Mid
    [SerializeField] private Toggle _forwardToReflectedLinksToggle;
    [SerializeField] private Toggle _inverseToReflectedLinksToggle;
    [SerializeField] private Color _reflectedThroughMidColor;


    [SerializeField] private SpiralCalculator _spiralCalculator;


    void Awake()
    {
        _forwardLinksToInverseReflectedLinksToggle = GameObject.Find("FtIR_Links").GetComponent<Toggle>();
        _inverseLinksToForwardReflectedLinksToggle = GameObject.Find("ItFR_Links").GetComponent<Toggle>();

        _forwardToInverseToggle = GameObject.Find("ForwardToInverseToggle").GetComponent<Toggle>();
        _forwardReflectedToInverseReflectedToggle = GameObject.Find("ForwardReflectedToInverseReflectedToggle").GetComponent<Toggle>();
        
        _forwardToReflectedLinksToggle = GameObject.Find("ForwardToForwardReflectedToggle").GetComponent<Toggle>();
        _inverseToReflectedLinksToggle = GameObject.Find("InverseToInverseReflectedToggle").GetComponent<Toggle>();


        _spiralCalculator = GameObject.Find("Spiral Calculator").GetComponent<SpiralCalculator>();

        _clearAllButton = GameObject.Find("GridClearAllButton").GetComponent<Button>();
        _clearAllButton.onClick.AddListener(() =>
        {
            _forwardLinksToInverseReflectedLinksToggle.isOn = false;
            _inverseLinksToForwardReflectedLinksToggle.isOn = false;
            _forwardToInverseToggle.isOn = false;
            _forwardReflectedToInverseReflectedToggle.isOn = false;
            _forwardToReflectedLinksToggle.isOn = false;
            _inverseToReflectedLinksToggle.isOn = false;
        });

        _reflectedThroughMidColor.a = 0.1f;
    }

    public override void DrawShapes(Camera cam)
    {
        using (Draw.Command(cam))
        {
            Draw.LineGeometry = LineGeometry.Volumetric3D;
            Draw.ThicknessSpace = ThicknessSpace.Pixels;

            // set static parameter to draw in the local space of this object
            Draw.Matrix = transform.localToWorldMatrix;

            DrawGrid();
        }
    }

    private void DrawGrid()
    {
        if (_forwardLinksToInverseReflectedLinksToggle.isOn) DrawLinksToLinks();
        if (_inverseLinksToForwardReflectedLinksToggle.isOn) DrawInverseLinksToForwardReflectedLinks();
        if (_forwardReflectedToInverseReflectedToggle.isOn || _forwardToInverseToggle.isOn)DrawReflectedLinks();
        if (_forwardToReflectedLinksToggle.isOn || _inverseToReflectedLinksToggle.isOn) DrawReflectedThroughMidLinks();
    }

    private void DrawLinksToLinks()
    {
        var middleIndex = (int)Math.Floor(_spiralCalculator.GetIndex());
        var zakLinks = _spiralCalculator.GetZakLinks();

        using (Draw.StyleScope)
        {
            Draw.Color = _linksToLinksColor;
            Draw.Thickness = 1f;

            for (int i = 0; i <= middleIndex; i++)
            {
                var from = zakLinks[i];
                var to = zakLinks[zakLinks.Length - 1 - i];
                Draw.Line(from, to);
            }
        }
    }

    private void DrawInverseLinksToForwardReflectedLinks()
    {
        var middleIndex = (int)Math.Floor(_spiralCalculator.GetIndex());
        var zakLinks = _spiralCalculator.GetZakLinks();
        var mid2 = _spiralCalculator.GetMidPoint() * 2.0;

        using (Draw.StyleScope)
        {
            Draw.Color = _linksToLinksColor;
            Draw.Thickness = 1f;

            for (int i = 0; i <= middleIndex; i++)
            {
                var from = mid2 - zakLinks[zakLinks.Length - 1 - i];
                var to = mid2 - zakLinks[i];
                Draw.Line(from, to);
            }
        }
    }

    private void DrawReflectedLinks()
    {
        var middleIndex = (int)Math.Floor(_spiralCalculator.GetIndex());
        var zakLinks = _spiralCalculator.GetZakLinks();
        var mid2 = _spiralCalculator.GetMidPoint() * 2.0;

        using (Draw.StyleScope)
        {
            Draw.Color = _reflectedLinksColor;
            Draw.Thickness = 1f;

            for (int i = 0; i <= middleIndex; i++)
            {
                if(_forwardToInverseToggle.isOn)
                {
                    var from = zakLinks[i];
                    var to = mid2 - zakLinks[zakLinks.Length - 1 - i];
                    Draw.Line(from, to);
                }
                
                if (_forwardReflectedToInverseReflectedToggle.isOn)
                {
                    var from = zakLinks[zakLinks.Length - 1 - i];
                    var to = mid2 - zakLinks[i];
                    Draw.Line(from, to);
                }
                
            }
        }
    }
    
    private void DrawReflectedThroughMidLinks()
    {
        var middleIndex = (int)Math.Floor(_spiralCalculator.GetIndex());
        var zakLinks = _spiralCalculator.GetZakLinks();
        var mid2 = _spiralCalculator.GetMidPoint() * 2.0;

        using (Draw.StyleScope)
        {
            Draw.Color = _reflectedThroughMidColor;
            Draw.Thickness = 1f;

            for (int i = 0; i <= middleIndex; i++)
            {
                if (_forwardToReflectedLinksToggle.isOn)
                {
                    var from = zakLinks[i];
                    var to = mid2 - zakLinks[i];
                    Draw.Line(from, to);
                }

                if (_inverseToReflectedLinksToggle.isOn)
                {
                    var from = zakLinks[zakLinks.Length - 1 - i];
                    var to = mid2 - zakLinks[zakLinks.Length - 1 - i];
                    Draw.Line(from, to);
                }
            }
        }
    }
}
