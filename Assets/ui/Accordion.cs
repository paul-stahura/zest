using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class Accordion : MonoBehaviour
{
    public bool StartExstended = false;
    public float animSpeed = 0.1f;
    public bool IsExstended {get; private set;} = false;

    // this rect transform
    public RectTransform rect;
    // button for animating and can be used as a folder title
    public Button toggleButton;
    // the hidden content in the accordion
    public RectTransform content;
    [SerializeField] private ExpandableDropdownSettings _expandableDropdownSettings;

    private Coroutine _animCoroutine;
    private float _collapsedHight;
    private float _exstendedHeight;


    public void Start()
    {   
        SetContentSizes();
        if(_expandableDropdownSettings != null)
        {
            _expandableDropdownSettings.OnResize += (size) => 
            {
                _exstendedHeight = size.y + _collapsedHight;
                if(IsExstended)
                {
                    rect.sizeDelta = new Vector2(rect.sizeDelta.x, _exstendedHeight);
                }
            };
        }
    }

    public void OnValidate()
    {
        if (StartExstended != IsExstended)
        {
            SetContentSizes();
        }
    }

    public void CollapseInstant()
    {
        if (_animCoroutine != null) StopCoroutine(_animCoroutine);

        rect.sizeDelta = new Vector2(rect.sizeDelta.x, _collapsedHight - 1);
        IsExstended = false;
    }
    
    public void ExstendInstant()
    {
        if (_animCoroutine != null) StopCoroutine(_animCoroutine);

        rect.sizeDelta = new Vector2(rect.sizeDelta.x, _exstendedHeight + 1);
        IsExstended = true;
    }

    public void Toggle()
    {
        if(_animCoroutine != null) StopCoroutine(_animCoroutine);

        if(IsExstended)
        {
            _animCoroutine = StartCoroutine(Collapse());
        }
        else
        {
            _animCoroutine = StartCoroutine(Exstend());
        }
        
    }

    private IEnumerator Exstend()
    {
        if(IsExstended == false)
        {
            IsExstended = true;

            var targetSize = new Vector2(rect.sizeDelta.x, _exstendedHeight + 1);
            while(rect.sizeDelta.y < _exstendedHeight)
            {
                rect.sizeDelta = Vector2.Lerp(rect.sizeDelta, targetSize, animSpeed);
                yield return new WaitForFixedUpdate();
            }

            rect.sizeDelta = targetSize;
        }
    }

    private IEnumerator Collapse()
    {
        if(IsExstended == true)
        {
            IsExstended = false;

            var targetSize = new Vector2(rect.sizeDelta.x, _collapsedHight - 1);
            while(rect.sizeDelta.y > _collapsedHight)
            {
                rect.sizeDelta = Vector2.Lerp(rect.sizeDelta, targetSize, animSpeed);
                yield return new WaitForFixedUpdate();
            }

            rect.sizeDelta = targetSize;

        }
    }

    private void SetContentSizes()
    {
        _collapsedHight = toggleButton.GetComponent<RectTransform>().sizeDelta.y;
        _exstendedHeight = content.sizeDelta.y + _collapsedHight;

        var startingHeight = StartExstended ? _exstendedHeight : _collapsedHight;
        rect.sizeDelta = new Vector2(rect.sizeDelta.x, startingHeight);
        IsExstended = StartExstended;
    }
}
