# Critical Strip Space Toggle Feature

This feature allows toggling between two different coordinate spaces for the critical strip visualization:

1. **Index Space** - The traditional view with y-axis representing indices from 0-11+
2. **Imaginary Space** - Alternative view with y-axis representing the imaginary values directly (t values)

## Quick Setup

1. Add the `SpaceToggleButton` prefab to your UI canvas
2. In the CriticalStripRenderer component, assign the button to the `spaceToggleButton` field
3. Optionally, assign the `SpaceModeText` child object to the `spaceModeText` field to display the current mode

## Key Components

### 1. CriticalStripTransform

The core coordinate transformation system now supports both index and imaginary spaces. It tracks both coordinate ranges in parallel and automatically converts between them.

### 2. IndexLabelsRenderer

The label system has been updated to display appropriate values in both spaces. In imaginary space, it uses "t=" prefix and adjusts the label density and decimal places based on the visible range.

### 3. CriticalStripRenderer

The renderer has been modified to:
- Toggle between spaces when the button is clicked
- Use appropriate sensitivities for zooming and scrolling in each space
- Convert values correctly for point interactions

### 4. Testing Tools

Several editor tools were added to help test the conversion:

- **Critical Strip > Toggle Space Mode** - Toggles the space mode on the active renderer
- **Critical Strip > Test Index To Imag Conversion** - Logs conversion values for testing
- **Critical Strip > Test Imag To Index Conversion** - Logs conversion values for testing
- **Critical Strip > Space Toggle Testing** - Opens a window for interactive testing

## Conversion Formulas

The conversions between spaces use these formulas from the Zeta class:

```csharp
// Convert from index to imaginary (t value)
IndexToImag(double index, bool usePoly=false)
{
    if(usePoly)
    {
        // Polynomial formula: 2pi*(t^2+t+1/6)
        return 2.0 * Math.PI * ((n*n) + n + (1.0/6.0));
    }
    else
    {
        // Standard formula: (π (2n + 1))/(log(n + 1) - log(n))
        return (n * 2.0 + 1.0) * Math.PI / (Math.Log(n + 1.0) - Math.Log(n));
    }
}

// Convert from imaginary (t value) to index
ImagToIndex(double imag)
{
    // Using Zzrob's formula
    double gamma = 0.57721566490153286060651209008240243104215933593992;
    double e = 2.7182818284590452353602874713526624977572;
    double gamma_to_the_e = Math.Pow(gamma, e);
    double two_root_3_pi = 2 * Math.Sqrt(3 * Math.PI);
    return Math.Sqrt(6 * gamma_to_the_e / imag + 6 * imag + Math.PI) / two_root_3_pi - 1.0 / 2.0;
}
```

## Implementation Notes

1. For zooming and scrolling in imaginary space, the sensitivity values are increased since the range is much larger
2. The minimum allowed value for both spaces is protected (equivalent of index = -1)
3. When toggling spaces, the current view is preserved as much as possible by converting between equivalent ranges

## Known Issues

- The approximation for converting from imaginary to index has some small error, especially for larger values
- Initial zoom settings may need adjustment based on project-specific needs

## Future Improvements

- Consider adding a mode that uses a logarithmic scale for imaginary space
- Add more visual indicators to show which space is active
- Optimize the conversion calculations for better performance 