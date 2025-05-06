# Critical Strip Visualization System (Revised)

## Overview
The Critical Strip Visualization System is a Unity-based tool designed to render and interact with points defined in the Riemann Zeta function's critical strip. This revised version features a refactored architecture that ensures optimal performance and smooth user interactions, even with large point datasets.

Key improvements include:
- Decoupled rendering and interaction logic
- Optimized mesh-based point rendering with advanced performance optimizations
- Enhanced coordinate transformations with high precision and snap-to-grid behavior
- A streamlined UI with a collapsible critical strip window and smooth animations
- A new interaction handler that centralizes user input events

## Core Components

### 1. CriticalStripWindow
Manages the UI container (collapsible window) for the critical strip display.
- Provides smooth expand/collapse animations using easing curves.
- Integrates updated UI controls and event handling, decoupled from rendering logic for improved responsiveness.

### 2. CriticalStripTransform
Handles conversions between coordinate spaces:
- **Critical Strip Space:** (real [0,1], index)
- **Viewport Space:** Local UI coordinates
- **Screen Space:** Mouse/touch input coordinates

Features include high-precision arithmetic and a snap-to-grid behavior for points near the critical line (real = 0.5) with dynamically configurable thresholds.

### 3. PointSet
Represents a collection of points loaded from CSV files.
- Supports a metadata header (set name, color in #RRGGBBAA format, and a skipCriticalLine flag) to boost performance.
- Enhanced error handling with robust CSV parsing and high-precision coordinate management.

### 4. CriticalStripRenderer
The core component responsible for rendering points using advanced mesh-based techniques:
- Efficiently generates custom meshes for high-density point rendering.
- Separates rendering operations from user input logic to improve performance and maintainability.
- Supports smooth panning, zooming, and real-time point selection with optimized culling and batching.

### 5. PointSetManager
Manages the loading, saving, and organization of multiple point sets.
- Integrates with CSV file formats including metadata for color coding and optimization flags.
- Implements filtering and batch processing to handle large datasets effectively.
- Provides multi-select options and dynamic toggling of point set visibility.

### 6. PointsMeshRenderer
Handles optimized mesh generation for point visualization:
- Dynamically adjusts point size and color based on zoom and other parameters.
- Implements off-screen culling and batching techniques to ensure smooth performance during interactions.

### 7. PointsMeshHoverOverlay
Manages hover interactions over rendered points:
- Detects and animates hover effects with configurable thresholds.
- Implements snap-to-grid behavior for more precise point selection, especially near the critical line.
- Provides real-time coordinate updates during hover events.

### 8. IndexLabelsRenderer
Renders dynamically-scaled index labels aligned with the point sets:
- Automatically adjusts label density and formatting based on the current zoom level.
- Ensures clear visual context by aligning labels with their corresponding points.

### 9. CriticalStripStats
Displays real-time statistics about the rendered points:
- Shows totals for points rendered and other active metrics useful for debugging and performance monitoring.

### 10. PointSetInteractionHandler
A newly integrated component dedicated to managing user input:
- Centralizes mouse, touch, and keyboard interactions (clicks, drags, zooming, and keyboard shortcuts).
- Decouples interaction logic from rendering components, ensuring a cleaner and more maintainable codebase.

## Interaction and Event Handling

- User actions (hover, click, drag, keyboard input) are managed by the PointSetInteractionHandler, which translates these events into coordinate adjustments via the CriticalStripTransform.
- The CriticalStripRenderer and PointsMeshHoverOverlay respond to these updates, providing immediate visual feedback through smooth animations and snap-to-grid selections.
- Integration with the main App.cs enables bidirectional event flow (e.g., RealChanged, IndexChanged), ensuring the visualization state remains synchronized with the overall application.

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