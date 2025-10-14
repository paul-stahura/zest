/// <summary>
/// DescriptionUI is a component that can be attached to UI elements to provide descriptive text functionality.
/// It implements pointer event handlers to show and hide descriptions when the user hovers over the UI element.
/// 
/// when adding this component to a UI element, ensure that the _descriptionID is set -1.
/// Then us the AssignDescriptionIDs script to assign a unique ID and key to the component.
/// </summary>
using UnityEngine;
using UnityEngine.EventSystems;

public class DescriptionUI : MonoBehaviour, IPointerEnterHandler, IPointerExitHandler
{
    [SerializeField] private int _descriptionID = -1;
    public string key { get; private set; }

    public int descriptionID
    {
        get { return _descriptionID; }
        set
        {
            if (_descriptionID != value)
            {
                _descriptionID = value;
            }
        }
    }

    public void AssighnKey(string newKey)
    {
        key = newKey;
    }

    public string GetHerarchyPath(Transform current)
    {
        if (current.parent == null)
            return current.name;
        return GetHerarchyPath(current.parent) + "/" + current.name;
    }

    public void OnPointerEnter(PointerEventData eventData)
    {
        DescriptionManager.LoadDescriptionUI(this);
    }

    public void OnPointerExit(PointerEventData eventData)
    {
        DescriptionManager.ClearDescriptionUI();
    }
}
