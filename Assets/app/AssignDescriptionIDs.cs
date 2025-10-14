/// <summary>
/// IdDescriptions is a utility script to assign unique IDs to DescriptionUI components in the scene.
/// It scans all DescriptionUI components and assigns IDs to those with an ID of -1.
/// 
/// each new instance of DescriptionUI should have a unique ID that is never changed or duplicated.
/// </summary>
using System.Collections.Generic;
using System.Text;
using UnityEngine;

#if UNITY_EDITOR
[ExecuteAlways]
#endif
public class AssignDescriptionIDs : MonoBehaviour
{
    public bool assignIds = false;

    void OnValidate()
    {
        if (assignIds)
        {
            assignIds = false;
            AssignIds();
        }
    }

    private void AssignIds()
    {
        // get all DescriptionUI components in the hierarchy
        DescriptionUI[] descriptionUIs = FindObjectsOfType<DescriptionUI>(true);

        // find the highest existing ID
        int maxId = -1;
        foreach (var descUI in descriptionUIs)
        {
            if (descUI.descriptionID > maxId)
            {
                maxId = descUI.descriptionID;
            }
        }

        // assign new IDs to components with ID -1
        foreach (var descUI in descriptionUIs)
        {
            if (descUI.descriptionID == -1)
            {
                maxId++;
                descUI.descriptionID = maxId;
            }
        }

        // check for duplicate IDs
        HashSet<int> idSet = new HashSet<int>();
        List<int> duplicateIds = new List<int>();
        foreach (var descUI in descriptionUIs)
        {
            if (!idSet.Add(descUI.descriptionID))
            {
                if (!duplicateIds.Contains(descUI.descriptionID))
                {
                    duplicateIds.Add(descUI.descriptionID);
                }
            }
        }

        // log results
        if (duplicateIds.Count > 0)
        {
            StringBuilder sb = new StringBuilder();
            sb.AppendLine("Duplicate DescriptionUI IDs found:");
            foreach (var dupId in duplicateIds)
            {
                sb.AppendLine($"ID: {dupId}");
                foreach (var descUI in descriptionUIs)
                {
                    if (descUI.descriptionID == dupId)
                    {
                        sb.AppendLine($" - {descUI.GetHerarchyPath(descUI.transform)}");
                    }
                }
            }
            Debug.LogWarning(sb.ToString());
        }
        else
        {
            Debug.Log("All DescriptionUI components have unique IDs assigned.");
        }
    }
}
