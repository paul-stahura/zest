# Critical Strip Overlay Visualization Specification

## Overview
A semi-transparent overlay window that displays point data relevant to the Riemann Zeta function's critical strip. The overlay will be positioned on the left side of the screen and support interactive features like zooming, scrolling, and point set selection. The overlay is implemented using Unity's Canvas system initially, with a fallback option to use a separate camera render if needed.

## Visual Design

### Window Properties
- **Position**: Left side of screen
- **Height**: Full screen height (100vh)
- **Width**: Fixed width (TBD, suggest 300-400 pixels)
- **Background**: Semi-transparent (suggest rgba(0,0,0,0.2))
- **Border**: Subtle border to define window edges
- **Z-Index**: Above main visualization
- **Event Priority**: Respects main visualization's event system

### Collapsible Behavior
- **Collapsed State**:
  - Small tab visible on left edge
  - Animated slide-out transition
  - Tab contains icon/text to indicate expandable
- **Expanded State**:
  - Full width visible
  - Animated slide-in transition
  - Close button in header

### Header UI Components
- **Point Set Selector**:
  - Multi-select checkbox list (ask product owner for the code for this UI)
  - Scrollable if many sets available
  - Each item shows:
    - Checkbox
    - Set name
    - Point count
    - Color indicator
- **Close Button**:
  - Top-right corner
  - Triggers collapse animation
- **Save Current Point Button**:
  - Saves current app state (real, index) to user points file
  - Visual feedback on save
- **Undo/Redo Navigation**:
  - Undo button - steps backward through point selection history
  - Redo button - steps forward through point selection history
  - Buttons disabled when no history available
- **Coordinate Display**:
  - Shows real and index values of hovered point
  - Updates in real-time during hover
  - Clear formatting for readability

## Point Interaction

### Point Hover Behavior
- **Visual Feedback**:
  - Point grows in size when hovered (suggest 2x normal size)
  - Smooth animation on hover enter/exit
  - Optional glow/highlight effect
- **Coordinate Display**:
  - Real and index values shown in header
  - Format: "Real: {0.000}, Index: {0.000}"
  - Updates in real-time during hover

### Point Selection
- **Click Behavior**:
  - Click to set app's real/index values
  - Visual feedback on selection
  - Smooth transition to new values
  - Updates App.cs values directly
  - Secondary priority to main visualization events
- **State Management**:
  - Save previous state to undo buffer before change
  - Clear undo buffer on external value changes
  - Maximum buffer size (suggest 50 states)
  - No persistence between sessions

### User Point Collection
- **Data Storage**:
  - Dedicated file for user-collected points
  - Automatic file creation if not exists
  - Append-only operation for point saving
  - No size limit enforced
- **File Format**:
  ```csv
  user_points,#00FF00
  timestamp,real,index
  2024-03-22T14:30:00,0.5,2.7
  ```
- **Point Set Properties**:
  - Name and color (with alpha) only
  - No additional metadata supported
  - No versioning or modification tracking

## Coordinate System

### Critical Strip Mapping
- **X-Axis**: 
  - Maps to real part [0,1]
  - Fixed range, non-zoomable
  - Gridlines/ticks at regular intervals
- **Y-Axis**:
  - Maps to "index" values
  - Default range [0,7]
  - Zoomable and scrollable
  - Gridlines/ticks at regular intervals
  - Labels show index values
- May need to use a logical [0,1] range for the y-axis, and then map it to the index values.
### Point Rendering
- **Shape**: Square points
  - Fixed pixel size (non-scaling with zoom)
  - Suggest 4x4 pixels default
- **Color**: 
  - Configurable per point set
  - Alpha support 
- **Rendering Method**: Two options (TBD based on performance testing):
  1. Unity UI:
    - Use the UI system to render the points. Let's try this first.
  1. Shapes Library:
     - Immediate mode drawing
     - **IMPORTANT**:   Does not work with Unity UI - THIS WILL BE AN ALTERNATIVE TO THE UI SYSTEM
     - Built-in batching
     - Easy color/style management
  2. Mesh Renderer:
     - Single mesh per point set
     - More efficient for large static sets
     - GPU instancing for performance

## Technical Implementation

### Core Components

1. **CriticalStripWindow** (MonoBehaviour)
   - Manages overall window state and layout
   - Handles collapse/expand animations
   - Contains UI elements
   ```csharp
   public class CriticalStripWindow : MonoBehaviour
   {
       public float Width { get; set; }
       public bool IsExpanded { get; private set; }
       public void Toggle();
       private void AnimateWindow(bool expand);
   }
   ```

2. **CriticalStripRenderer** (MonoBehaviour)
   - Handles point rendering
   - Manages coordinate transforms
   - Implements zooming/scrolling
   ```csharp
   public class CriticalStripRenderer : MonoBehaviour
   {
       public float MinIndex { get; set; }
       public float MaxIndex { get; set; }
       public void SetZoom(float zoom);
       public void ScrollTo(float index);
   }
   ```

3. **PointSetManager** (MonoBehaviour)
   - Loads point data files
   - Manages active point sets
   - Handles point set selection
   ```csharp
   public class PointSetManager : MonoBehaviour
   {
       public List<PointSet> LoadedSets { get; }
       public List<PointSet> ActiveSets { get; }
       public void LoadPointSet(string filename);
       public void ToggleSet(string setName, bool active);
   }
   ```

4. **PointSet** (Class)
   - Contains point data
   - Rendering properties
   ```csharp
   public class PointSet
   {
       public string Name { get; }
       public string Filename { get; }
       public Color Color { get; set; }
       public Vector2[] Points { get; }
       public bool IsActive { get; set; }
   }
   ```

5. **PointInteractionManager** (MonoBehaviour)
   - Manages point hover and selection
   - Handles coordinate display updates
   - Maintains undo/redo buffer
   ```csharp
   public class PointInteractionManager : MonoBehaviour
   {
       private Stack<(double real, double index)> UndoBuffer { get; }
       private Stack<(double real, double index)> RedoBuffer { get; }
       
       public void OnPointHover(Vector2 point);
       public void OnPointSelected(Vector2 point);
       public void OnExternalValueChange();
       public bool CanUndo { get; }
       public bool CanRedo { get; }
       public void Undo();
       public void Redo();
   }
   ```

6. **UserPointCollector** (MonoBehaviour)
   - Manages user point collection
   - Handles file I/O for point storage
   ```csharp
   public class UserPointCollector : MonoBehaviour
   {
       public string PointsFilePath { get; }
       public void SaveCurrentPoint();
       private void AppendToFile(double real, double index);
       private void EnsureFileExists();
   }
   ```

### File Format
Point set files will use a simple CSV format:
```csv
name,color
x1,y1
x2,y2
...
```

Example:
```csv
test_points,#FF0000
0.25,1.5
0.5,2.7
0.75,3.2
```

### Camera Setup
- Orthographic camera for critical strip view
- Viewport rect set to window bounds
- Uses ZoomToMouse.cs for zoom behavior
- Camera tracks vertical scrolling

### Coordinate Transformation
```csharp
public struct CriticalStripTransform
{
    // World to Strip coordinates
    public Vector2 WorldToStrip(Vector2 worldPos);
    
    // Strip to World coordinates
    public Vector2 StripToWorld(Vector2 stripPos);
    
    // Screen to Strip coordinates
    public Vector2 ScreenToStrip(Vector2 screenPos);
}
```

### Event System
```csharp
public class CriticalStripEvents
{
    public event Action<float> OnZoomChanged;
    public event Action<float> OnScrollChanged;
    public event Action<string, bool> OnSetToggled;
    public event Action<bool> OnWindowStateChanged;
    public event Action<Vector2> OnPointHover;
    public event Action<Vector2> OnPointSelected;
    public event Action OnPointSaved;
    public event Action OnUndoStateChanged;
    public event Action OnRedoStateChanged;
}
```

### App Integration
```csharp
public class CriticalStripController : MonoBehaviour
{
    private App _app;
    private PointInteractionManager _interactionManager;
    
    private void OnEnable()
    {
        _app.IndexChanged += OnExternalIndexChange;
        _app.RealChanged += OnExternalRealChange;
    }
    
    private void OnExternalValueChange()
    {
        _interactionManager.OnExternalValueChange();
    }
}
```

## Performance Considerations
1. Point culling for off-screen points
2. Batch rendering for active point sets
3. Efficient point data storage
4. Smooth zoom/scroll performance
5. Memory management for large point sets
6. Efficient undo/redo buffer management
7. Smooth point hover animations
8. Support for multiple visible point sets (no hard limit, performance to be tested)

## Dependencies
1. Unity UI system
2. Shapes library (optional)
3. ZoomToMouse.cs
4. Custom coordinate transform system
5. App.cs integration
6. File I/O system for user points

## Testing Plan
1. Generate test point sets:
   - Edge cases (0,1 boundaries)
   - Dense clusters
   - Sparse regions
   - Full range coverage
   - Maximum density cases
   - Extreme cases with many simultaneous point sets

2. Performance testing:
   - Large point sets (100k+ points)
   - Multiple active sets
   - Rapid zoom/scroll
   - Window toggle stress test
   - Canvas overlay performance validation
   - Event system interaction testing

3. Visual testing:
   - Point alignment
   - Grid accuracy
   - UI responsiveness
   - Animation smoothness

4. Interaction testing:
   - Point hover response time
   - Selection accuracy
   - Undo/redo functionality
   - User point collection
   - External value change handling

## Future Enhancements
1. Point set filtering
2. Custom point styles
3. Point labels/tooltips
4. Dynamic point loading
5. Export/import point sets
6. Integration with main visualization
7. Point set analysis tools
8. Enhanced point metadata
9. Point categorization
10. Advanced hover information
11. Custom point annotations 


## Next Steps
### Immediate Priorities:
- Create proof-of-concept for window management and basic point rendering
- Implement coordinate transformation system
- Set up point set data structure and file I/O
- Integrate with App.cs events
### Technical Investigation Needed:
- Performance testing with large point sets
- Unity UI vs custom rendering comparison
- Memory profiling for undo/redo buffer
- File I/O performance with large datasets
### Implementation Phases:
- Core window and rendering infrastructure
- Point set management and file I/O
- User interaction and state management
- Performance optimization and testing
### Additional Considerations:
- The existing codebase shows heavy use of Unity's UI system and the Shapes library
- The App.cs class already implements real/index value management
- Testing will use Unity Editor context menu items rather than traditional unit tests
- The system needs to maintain compatibility with existing spiral visualization features

