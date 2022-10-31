using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

[RequireComponent(typeof(Text))]
public class FloatLabel : MonoBehaviour
{
    float value;
    Text input;

    public string FormatString = "0.0000";

    public float Value
    {
        get { return value; }
        set
        {
            this.value = value;
            input.text = value.ToString(FormatString);
        }
    }

    void Start()
    {
        input = GetComponentInParent<Text>();
        if (null == input)
            Debug.LogError($"{name} does not have a Text compoenent");
    }
}
