using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

using UnityEngine.UI;
using UnityEngine.Events;

[Serializable]
public class IntEvent : UnityEvent<int> { }


[RequireComponent(typeof(InputField))]
public class IntInput : MonoBehaviour
{
    // saves the previous text in case something invalid was entered
    string prevText = "0";
    public InputField input;

    public int Value
    {
        get { return int.Parse(prevText); }
        set
        {
            input.text = value.ToString();
        }
    }

    [SerializeField] public IntEvent onValueChanged = new IntEvent();

    void OnApplicationQuit()
    {
        // PlayerPrefs.SetInt(gameObject.name + "-Value", Value);
        // PlayerPrefs.Save();
    }

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

        // Value = PlayerPrefs.GetInt(gameObject.name + "-Value", Value);

        // onValueChanged.Invoke(this.Value);
    }

    void verify(string txt)
    {
        int value;
        if (!int.TryParse(txt, out value))
        {
            // we were not able to parse the string into a int
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
    /// be parsed into a int.
    /// </summary>
    /// <param name="txt"></param>
    void validate(string txt)
    {
        int value;
        if (int.TryParse(txt, out value))
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
