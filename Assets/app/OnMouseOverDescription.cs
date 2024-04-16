using UnityEngine;
using UnityEngine.EventSystems;

public class OnMouseOverDescription: MonoBehaviour, IPointerEnterHandler, IPointerExitHandler{
	
    public string description = "Tell me more";
    public void OnPointerEnter(PointerEventData eventData)
    {
        Manual.UpdateDescription(description);
    }

    public void OnPointerExit(PointerEventData eventData)
    {
        Manual.UpdateDescription("");
    }
}
