using UnityEngine;
using UnityEngine.EventSystems;

public class OnMouseOverDescription: MonoBehaviour, IPointerEnterHandler{
	
    public string description = "Tell me more";
    public void OnPointerEnter(PointerEventData eventData)
    {
        Manual.UpdateDescription(description);
    }
}
