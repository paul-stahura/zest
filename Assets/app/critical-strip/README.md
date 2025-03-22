# Critical Strip Visualization System

## Overview
The Critical Strip Visualization is a Unity-based overlay system that displays point data relevant to the Riemann Zeta function's critical strip. It provides an interactive window on the left side of the screen where users can view, select, and save points of interest.

## Core Components

### 1. CriticalStripWindow
The main container component that manages the overlay window's state and behavior.

Key features:
- Collapsible window with smooth animations
- Semi-transparent background
- Header with controls
- Point set list
- Point visualization area

### 2. CriticalStripTransform
Handles coordinate transformations between different spaces:
- Critical Strip Space: (real [0,1], index)
- Viewport Space: Local UI coordinates
- Screen Space: Mouse/touch input coordinates

```csharp
// Example transformations
Vector2 viewportPos = transform.StripToViewport(stripPos);
Vector2 stripPos = transform.ViewportToStrip(viewportPos);
Vector2 stripPos = transform.ScreenToStrip(screenPos);
```

### 3. PointSet
Represents a collection of points with shared properties:
- Name
- Color
- Active state
- Point data (real, index pairs)

File format:
```csv
set_name,#RRGGBBAA
timestamp,real,index
2024-03-22T14:30:00,0.5,2.7
```

### 4. CriticalStripRenderer
Handles the visualization of points and user interaction:
- Point rendering using Unity UI system
- Point hover effects
- Point selection
- Coordinate updates

### 5. PointSetManager
Manages point sets and handles file I/O:
- Loading/saving point sets
- User point collection
- Point set toggling
- Integration with App.cs

### 6. CoordinateDisplay
Displays current coordinates:
- Real and index values
- Updates on hover
- Updates on point selection

## Integration with App.cs

The system integrates with the main App.cs through events:
```csharp
// Subscribing to App.cs events
app.RealChanged += OnRealChanged;
app.IndexChanged += OnIndexChanged;

// Updating App.cs values
app.Real = selectedPoint.x;
app.Index = selectedPoint.y;
```

## Point Interaction System

### Hover Behavior
1. Mouse enters point vicinity
2. Point scales up (2x default size)
3. Coordinates update in display
4. Returns to normal on mouse exit

### Selection Behavior
1. Click point or viewport area
2. Coordinates are sent to App.cs
3. App.cs updates its state
4. Other visualizations update accordingly

### Point Saving
1. Navigate to desired point
2. Click "Save Point" button
3. Point is saved with timestamp
4. Point set is automatically reloaded
5. New point appears in visualization

## Coordinate Systems

### Critical Strip Space
- X-axis: Real part [0,1]
- Y-axis: Index values
- Default range: [0,7]
- Supports zooming on Y-axis

### Viewport Space
- Normalized to window dimensions
- Handles point positioning
- Manages UI layout

## File Management

### User Points File
- Location: Application.persistentDataPath
- Format: CSV
- Auto-created if not exists
- Append-only for new points

### Point Set Files
- Support for multiple point sets
- Color coding
- Toggle visibility
- Efficient loading/saving

## Performance Considerations

### Point Rendering
- Uses Unity UI system
- Object pooling for large sets
- Culling for off-screen points
- Efficient coordinate transforms

### Event Handling
- Debounced coordinate updates
- Efficient point hover detection
- Optimized point selection

## Setup Instructions

Detailed setup instructions are available in [SETUP.md](SETUP.md).

## Usage Examples

### Adding a New Point Set
```csharp
var pointSet = new PointSet("example_set", Color.blue);
pointSet.AddPoint(0.5f, 2.7f);
pointSetManager.AddPointSet(pointSet);
```

### Saving Current Point
```csharp
pointSetManager.SaveCurrentPoint();
```

### Toggling Point Set Visibility
```csharp
pointSetManager.TogglePointSet("example_set", false);
```

## Troubleshooting

### Common Issues

1. Points Not Appearing
   - Check Point Viewport mask
   - Verify PointPrefab assignment
   - Check RectTransform settings

2. Coordinate Transform Issues
   - Verify viewport dimensions
   - Check index range settings
   - Validate transform initialization

3. Point Selection Not Working
   - Check EventSystem setup
   - Verify Raycast Target settings
   - Validate App.cs integration

## Future Enhancements

1. Planned Features
   - Point filtering
   - Custom point styles
   - Advanced hover information
   - Point annotations
   - Dynamic loading for large sets

2. Performance Optimizations
   - GPU instancing for points
   - Spatial partitioning
   - Async file operations

## Dependencies

- Unity UI System
- TextMeshPro
- App.cs integration
- Unity EventSystem

## Best Practices

1. Point Management
   - Use appropriate point set grouping
   - Maintain reasonable set sizes
   - Clear unused point sets

2. User Interaction
   - Provide visual feedback
   - Maintain responsive UI
   - Handle edge cases gracefully

3. File Operations
   - Use try-catch for I/O
   - Validate file formats
   - Handle missing files gracefully 