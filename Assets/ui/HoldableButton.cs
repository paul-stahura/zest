using UnityEngine;
using UnityEngine.UI;
using UnityEngine.EventSystems;

[RequireComponent(typeof(Button))]
[RequireComponent(typeof(MouseEventCapture))]
public class HoldableButton : MonoBehaviour
{
    float _downStart;   // track the time when button was first pressed
    Button _button;

    [Tooltip("How many seconds the button must be held to fire the Held event")]
    public float HoldDelay = .5f;

    // Returns true if the button is currently down
    public bool IsDown { get; private set; }

    // Returns true if the button is in the 'held' state 
    // (held down for longer than HoldDelay)
    public bool IsHeld { get; private set; }

    // Fired immediately when button is released
    public event System.Action Up;
    // Fired immediately when button is pressed
    public event System.Action Down;
    // Fired after HoldDelay milliseconds after button was pressed
    public event System.Action Held;
    public event System.Action Click;

    void Start()
    {
        _button = GetComponent<Button>();
        var m = GetComponent<MouseEventCapture>();
        m.OnMouseDown += handleMouseDown;
        m.OnMouseUp += handleMouseUp;

        // Pass the click event through for consistent event handling
        _button.onClick.AddListener(() => this.Click?.Invoke());
    }

    void Update()
    {
        // If the button is currently in the 'down' state, check if it has been
        // held for more than HoldDelay milliseconds.  If so, fire the Held
        // event but only if we haven't fired it before
        if (IsDown)
        {
            if (Time.time - _downStart >= HoldDelay && !IsHeld)
            {
                IsHeld = true;
                Held?.Invoke();
            }
        }
    }

    public void InvokeClick() => Click?.Invoke();

    void handleMouseDown(PointerEventData data)
    {
        _downStart = Time.time;
        IsDown = true;
        Down?.Invoke();
    }

    void handleMouseUp(PointerEventData data)
    {
        if (Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift))
        {
            return;
        }

        IsDown = false;
        IsHeld = false;
        Up?.Invoke();
    }
}