using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

using UnityEngine.UI;
using UnityEngine.Events;

[Serializable]
public class FloatEvent : UnityEvent<float> { }


[RequireComponent(typeof(InputField))]
public class FloatInput : MonoBehaviour
{
    // saves the previous text in case something invalid was entered
    string prevText = "0";
    public InputField input;

    public string FormatString = "0.0000";

    public float Value
    {
        get { return float.Parse(prevText); }
        set
        {
            input.text = value.ToString(FormatString);
        }
    }

    [SerializeField] public FloatEvent onValueChanged = new FloatEvent();

    void Awake()
    {
        input = GetComponentInParent<InputField>(); // find the actual control
        prevText = input.text;              // save the previous text (default value)
        validate(input.text);               // verify the default value can be parsed
    }
    void Start()
    {
        input.onValueChanged.AddListener(validate);  // listen for changes
        input.onEndEdit.AddListener(verify);

        // onValueChanged.Invoke(this.Value);
    }

    void verify(string txt)
    {
        float value;
        if (!float.TryParse(txt, out value))
        {
            // we were not able to parse the string into a float
            // so set the text box back to its previous good value
            input.text = prevText;
        }
        else
        {
            // fire out own event others can listen to
            onValueChanged.Invoke(value);
        }
    }

    /// <summary>
    /// Validate the value in the input box. Turn the text red if it can't
    /// be parsed into a float.
    /// </summary>
    /// <param name="txt"></param>
    void validate(string txt)
    {
        float value;
        if (float.TryParse(txt, out value))
        {
            prevText = txt;
            input.textComponent.color = Color.black;
        }
        else
        {
            input.textComponent.color = Color.red;
        }
    }
}
