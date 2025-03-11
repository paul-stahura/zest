using System;
using UnityEngine;

using UnityEngine.UI;
using UnityEngine.Events;

[Serializable]
public class DoubleInputEvent : UnityEvent<double> { }


[RequireComponent(typeof(InputField))]
public class DoubleInput : MonoBehaviour
{
    // saves the previous text in case something invalid was entered
    string prevText = "0";
    public InputField input;

    public string FormatString = "0.000000000000000";

    public double Value
    {
        get { return double.Parse(prevText); }
        set
        {
            input.text = value.ToString(FormatString);
        }
    }

    public static implicit operator double(DoubleInput v) => v.Value;
    

    [SerializeField] public DoubleInputEvent onValueChanged = new DoubleInputEvent();

    void OnApplicationQuit()
    {
        // PlayerPrefs.Setdouble(gameObject.name + "-Value", Value);
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

        // Value = PlayerPrefs.Getdouble(gameObject.name + "-Value", Value);

        // onValueChanged.Invoke(this.Value);
    }

    void verify(string txt)
    {
        double value;
        if (!double.TryParse(txt, out value))
        {
            // we were not able to parse the string into a double
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
    /// be parsed into a double.
    /// </summary>
    /// <param name="txt"></param>
    void validate(string txt)
    {
        double value;
        if (double.TryParse(txt, out value))
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
