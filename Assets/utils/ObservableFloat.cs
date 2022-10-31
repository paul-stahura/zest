

public class ObservableFloat
{
    float _value;

    public float Value
    {
        get { return _value; }
        set
        {
            if (value != _value)
            {
                _value = value;
                Changed?.Invoke(value);
            }
        }
    }

    public event System.Action<float> Changed;

    // public static implicit operator float(ObservableFloat t) => t.Value;
    // public static explicit operator ObservableFloat(float t) => new ObservableFloat(t);

    public ObservableFloat(float f)
    {
        _value = f;
    }

    public override string ToString()
    {
        return $"{Value}";
    }
}