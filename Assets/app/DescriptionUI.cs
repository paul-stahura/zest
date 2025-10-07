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

    private string GetHerarchyPath(Transform current)
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
