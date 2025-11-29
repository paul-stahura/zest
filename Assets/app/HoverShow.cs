using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class HoverShow : Selectable
{
    [SerializeField] private GameObject toShow;

    public override void OnPointerEnter(UnityEngine.EventSystems.PointerEventData eventData)
    {
        base.OnPointerEnter(eventData);
        Show(true);
    }

    public override void OnPointerExit(UnityEngine.EventSystems.PointerEventData eventData)
    {
        base.OnPointerExit(eventData);
        Show(false);
    }

    private void Show(bool show)
    {
        if(toShow != null)
        {
            toShow.SetActive(show);
        }
        else
        {
            // backup plan: try to find a child object named "ShowMe"
            Transform child = transform.Find("ShowMe");
            if(child != null)
            {
                child.gameObject.SetActive(show);
            }
        }
    }
}
