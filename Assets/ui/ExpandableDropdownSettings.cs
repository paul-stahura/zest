using System;
using System.Collections;
using System.Collections.Generic;
using SRF;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class ExpandableDropdownSettings : MonoBehaviour
{
    public Action<Vector2> OnResize;
    [SerializeField] private GameObject _context;
    [SerializeField] private TMP_Dropdown _dropdown;
    [SerializeField] private Image _background;
    [SerializeField] private List<GameObject> _expandableObjects;

    private RectTransform _rect;

    void Awake()
    {
        _rect = GetComponent<RectTransform>();

        _dropdown.onValueChanged.AddListener(delegate { ExpandSelected(); });
        ExpandSelected();
    }

    private void ExpandSelected()
    {
        ChangeBackground();
        for(int i = 0; i < _expandableObjects.Count; i++)
        {
            GameObject obj = _expandableObjects[i];
            if(obj != null)
            {
                obj.SetActive(i == _dropdown.value);
            }
        }

        ResizeContext();
    }

    private void ResizeContext()
    {
        if(_context != null)
        {
            float height = 0;
            foreach(RectTransform r in transform.GetChildren())
            {
                if(r.gameObject.activeSelf)
                {
                    height += r.sizeDelta.y;
                }
            }
            _rect.sizeDelta = new Vector2(_rect.sizeDelta.x, height + 2);

            OnResize?.Invoke(_rect.sizeDelta);
        }
    }

    private void ChangeBackground()
    {
        if(_background != null)
        {
            _background.sprite = _dropdown.options[_dropdown.value].image;
        }
    }
}
