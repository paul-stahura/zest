using UnityEngine.UI;

public class TrackedVariable
{
    double value;
    string name;
    string display;
    string format;
    Text label;

    public double Value
    {
        get { return value; }
        set
        {
            this.value = value;

            string pre = display;
            if (string.IsNullOrEmpty(pre))
                pre = name;

            label.text = $"{pre}: {value.ToString(format)}";
        }
    }

    public TrackedVariable(string name, Text label, string format, string display)
    {
        this.name = name;
        this.display = display;
        this.format = format;
        this.label = label;
    }
}