using UnityEngine;
using UnityEngine.EventSystems;

public delegate void UnityMouseEvent(PointerEventData data);

public class MouseEventCapture : MonoBehaviour,
    IPointerUpHandler,
    IPointerDownHandler,
    IDragHandler,
    IPointerEnterHandler,
    IPointerExitHandler

{
    public event UnityMouseEvent OnMouseUp;
    public event UnityMouseEvent OnMouseDown;
    public event UnityMouseEvent OnMouseDrag;
    public event UnityMouseEvent OnMouseEnter;
    public event UnityMouseEvent OnMouseExit;

    public void OnPointerUp(PointerEventData data)
    {
        if (OnMouseUp != null)
            OnMouseUp(data);
    }

    public void OnPointerDown(PointerEventData data)
    {
        if (OnMouseDown != null)
            OnMouseDown(data);
    }

    public void OnDrag(PointerEventData eventData)
    {
        if (OnMouseDrag != null)
            OnMouseDrag(eventData);
    }

    public void OnPointerEnter(PointerEventData eventData)
    {
        if (OnMouseEnter != null)
            OnMouseEnter(eventData);
    }

    public void OnPointerExit(PointerEventData eventData)
    {
        if (OnMouseExit != null)
            OnMouseExit(eventData);
    }
}
