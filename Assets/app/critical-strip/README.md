# Critical Strip Visualization System (Revised)

## Overview

The Critical Strip Visualization System is a Unity-based tool designed to render and interact with points from the Riemann Zeta function's critical strip. This revised version features a completely refactored, high-performance architecture that separates interaction logic from the rendering pipeline, ensuring smooth and responsive visualization of very large point datasets.

The system is built on a modular architecture where each component has a clear responsibility:
-   **View & Interaction Control (`CriticalStripRenderer`)**: Manages the viewport, user input for pan & zoom, and drawing auxiliary graphics like the critical line and position indicator.
-   **Data & Rendering Pipeline (`PointSetManager`, `PointsMeshRenderer`)**: Handles loading point set files and orchestrates the efficient, mesh-based rendering of millions of points.
-   **Point-Specific Interaction (`PointSetInteractionHandler`)**: Captures mouse events like clicks and hovers for the otherwise non-interactive rendered mesh.

A key feature of this system is its **dual-coordinate space**, allowing the user to seamlessly toggle the vertical axis between traditional **Index** values and the corresponding **Imaginary** `t` values of the zeta function zeros.

## Core Components

### 1. PointSetManager
The central coordinator of the visualization. It is responsible for:
-   Loading and parsing point set data from `.csv` files.
-   Managing the lifecycle of all active point sets.
-   Orchestrating the rendering pipeline by creating and managing `PointsMeshRenderer` instances for each point set.
-   Chunking large point sets (over 5,000 points) into multiple mesh renderers to stay within Unity's vertex limits.
-   Attaching a `PointSetInteractionHandler` to each set to enable user interaction.

### 2. PointsMeshRenderer
This is a highly optimized, custom UI component that renders a list of points as a single mesh.
-   Inherits from `MaskableGraphic` to generate mesh geometry directly via the `OnPopulateMesh` method.
-   Renders thousands of points in a single draw call, providing excellent performance.
-   Performs its own view frustum culling to avoid generating vertices for off-screen points.
-   It is a pure renderer and does not handle any input itself.

### 3. PointSetInteractionHandler
This component enables user interaction for the otherwise non-interactive meshes created by `PointsMeshRenderer`.
-   It's attached to a transparent UI object that overlays its corresponding point set.
-   It captures all pointer events (click, move, enter, exit).
-   On user interaction, it searches through the raw data of **all active point sets** to find the nearest point to the cursor.
-   For hover effects, it manages a single, dedicated "hover point" GameObject, which it moves to the position of the hovered data point and animates. This avoids costly mesh regeneration.

### 4. CriticalStripRenderer
This component now acts as the primary **View Controller**. Its previous role of rendering points via prefabs is legacy and no longer used by the `PointSetManager`. Its current responsibilities include:
-   Handling all user input for **panning** (drag) and **zooming** (scroll) the viewport.
-   Owning and providing access to the `CriticalStripTransform`.
-   Emitting an `OnViewportChanged` event that other components (like `PointSetManager` and `IndexLabelsRenderer`) subscribe to.
-   Rendering auxiliary UI elements:
    -   A vertical line at the critical line (real = 0.5).
    -   A blinking indicator for the current position selected in the app.

### 5. CriticalStripTransform
A non-MonoBehaviour class that handles all coordinate space conversions.
-   **Dual-Space Y-Axis**: Converts between `Index` and `Imaginary` `t`-values for the y-axis.
-   **Coordinate Systems**: Manages transformations between:
    -   **Critical Strip Space**: The logical coordinates (real `[0,1]`, and `index` or `imaginary` `y`).
    -   **Viewport Space**: The local pixel coordinates of the UI `RectTransform`.
    -   **Screen Space**: The global pixel coordinates from mouse/touch input.
-   **Snap-to-Line**: Snaps any click or selection within a 3-pixel threshold of the critical line to `real = 0.5` for ease of use.

### 6. IndexLabelsRenderer
Renders dynamically-scaled labels for the vertical axis of the viewport.
-   Subscribes to `CriticalStripRenderer.OnViewportChanged` to redraw labels on pan or zoom.
-   Intelligently adjusts label density and decimal precision based on the visible range.
-   Supports both **Index** and **Imaginary** space, displaying the correct labels (e.g., with a "t=" prefix for imaginary values).

### 7. PointSet
A data class representing a collection of points loaded from a file.
-   Stores metadata like `Name`, `Color`, `PointSize`, and optimization flags.
-   Holds the original point data using `double` precision for accuracy.

### 8. CriticalStripWindow
Manages the collapsible UI panel that contains the entire visualization.
-   Provides smooth expand/collapse animations with easing.

### 9. CriticalStripStats
A simple UI component that displays real-time statistics, such as the total number of points loaded.

## File Management
Point set data is managed via `.csv` files located in `Assets/Resources/CriticalStripPoints/`. The system uses an enhanced file format that includes metadata directly in the file.

### Enhanced Header Format
The system recognizes special `#@` comment lines as metadata keys.
-   `#@name`: The display name of the set.
-   `#@color`: The color in `#RRGGBBAA` hex format.
-   `#@skipCriticalLine`: `true`/`false`. If true, points very close to the critical line will not be loaded to improve performance.
-   `#@samplingInterval`: An integer `N`. Loads only every Nth point from the file.
-   `#@pointSize`: A float defining the rendered size of the points.

The `PointSetManager` can automatically detect and convert older, simpler `.csv` files to this enhanced format on load.

## Interaction and Data Flow
1.  **Pan/Zoom**: The user interacts with the `CriticalStripRenderer`'s `RectTransform`. `CriticalStripRenderer` updates the view range in `CriticalStripTransform` and fires `OnViewportChanged`.
2.  **View Update**: `PointSetManager` and `IndexLabelsRenderer` listen for `OnViewportChanged`.
    -   `PointSetManager` recalculates the viewport positions of all points and updates the vertices in each `PointsMeshRenderer`.
    -   `IndexLabelsRenderer` redraws its labels based on the new visible range.
3.  **Hover/Click**: The user's mouse interacts with the `PointSetInteractionHandler`'s transparent `RectTransform`.
    -   The handler finds the closest point in the data.
    -   On **click**, it notifies the main `App` of the selected coordinates.
    -   On **hover**, it activates and animates its `hoverPoint` GameObject at the correct position.

## Performance Optimizations

- Advanced mesh-based rendering minimizes draw calls and leverages Unity's graphics pipeline for optimal performance.
- Off-screen culling and bulletproof batching reduce overhead during panning and zooming operations.
- Improved hover detection and debounced event handling eliminate unnecessary computations.
- Critical line filtering and adaptive snap-to-grid thresholds enhance responsiveness in dense point regions.

## File Management and Setup

- Point set data is managed via CSV files that include metadata for color coding and performance flags.
- Detailed setup instructions can be found in [SETUP.md](SETUP.md).
- For an in-depth technical breakdown of the revised system architecture and design goals, refer to [SPECIFICATION.md](SPECIFICATION.md).

## Best Practices

- Use distinctive color schemes for different point sets to enhance visual differentiation.
- Fine-tune the snap-to-grid threshold based on the current zoom level and interaction precision.
- Limit the number of active point sets to avoid performance degradation.
- Regularly update point set configurations to align with both performance and visual fidelity requirements.

## Future Enhancements

- Explore additional input modalities, such as touch gestures for mobile support.
- Further refine dynamic label rendering as zoom levels change in real time.
- Expand CSV support to include richer metadata for advanced filtering and customization options.

---

This README reflects the current design and implementation of the Critical Strip Visualization System. For further customization or to report issues, please refer to the respective component documentation within the codebase.

## Coordinate Systems and Zooming
The system operates within three distinct coordinate spaces:
 - Critical Strip Space: Represents the logical space where the x-axis corresponds to the real part (ranging within [0,1]) and the y-axis represents index values, including negatives. The default view range for indices is [0,7].
 - Viewport Space: The local coordinate system of the collapsible UI window where the visualization is rendered.
 - Screen Space: The coordinate space derived from input devices (e.g., mouse, touch) which is translated into the system's logical coordinates.

The CriticalStripTransform component handles precise conversions between these spaces. It supports:
 - Mouse wheel or touch-based zooming that auto-centers on the target coordinate.
 - Smooth panning with bounds checking to ensure the view remains in valid regions.
 - Dynamic label adjustments to maintain clarity and readability across different zoom levels.

## Performance Optimizations

### Point Rendering
- Custom mesh generation for efficient batching
- Off-screen point culling
- Viewport-based frustum culling
- Optimized hover detection for large sets
- Critical line points filtering for dense sets

### Event Handling
- Debounced coordinate updates
- Viewport-based event processing
- Efficient coordinate transformations

## File Management

### Point Set Files
- Support for multiple point set files
- CSV format with metadata header
- Color coding and per-set active state
- Automatic file loading/monitoring
- Skip critical line optimization flag

## Setup Instructions

Detailed setup instructions are available in [SETUP.md](SETUP.md).

## Best Practices

1. Point Set Management
   - Use clear naming conventions for point sets
   - Enable critical line skipping for large sets
   - Group related points in the same set
   - Use distinctive colors for different sets

2. User Interaction
   - Allow time for animations to complete
   - Provide visual feedback for selections
   - Save important points for later reference
   - Use zoom for detailed examination

3. Performance Considerations
   - Limit active point sets for best performance
   - Consider reducing point size for dense sets
   - Use appropriate zoom levels for interaction
   - Avoid unnecessary point set reloading

## Dependencies

- Unity UI System
- TextMeshPro
- App.cs integration
- Unity EventSystem

## Usage Examples

### Adding a New Point Set
```