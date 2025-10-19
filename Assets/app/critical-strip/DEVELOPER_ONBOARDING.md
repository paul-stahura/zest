# Critical Strip Visualization System - Developer Onboarding

Welcome to the Critical Strip visualization system! This guide will help you understand and work with this high-performance Unity-based tool for visualizing points from the Riemann Zeta function.

## What Are We Building?

We're building an **interactive point cloud visualization system** that displays millions of mathematical points efficiently while allowing smooth zooming, panning, and interaction. Think of it like Google Maps, but for mathematical data from the critical strip of the Riemann Zeta function.

**In plain terms**: Users can load point sets (like zeta zeros or primes), zoom in to examine specific regions, click on points to select them, and seamlessly switch between two different mathematical coordinate systems.

### Why This Architecture?

| Traditional Approach | Our Approach |
|---------------------|-------------|
| ❌ Prefab-based points (slow, memory-hungry) | ✅ Mesh-based rendering (fast, efficient) |
| ❌ Unity handles all interactions automatically | ✅ Custom interaction layer for precise control |
| ❌ Single coordinate system | ✅ Dual-space (Index ↔ Imaginary) with live switching |
| ❌ Points locked to viewport | ✅ Transform system handles all coordinate conversions |

## How to Start Reading the Code

**Start with these files in order:**

1. **`PointSet.cs`** (~130 lines) - The simplest: just data storage for points
2. **`CriticalStripTransform.cs`** (~230 lines) - Math-heavy: coordinate conversions
3. **`PointsMeshRenderer.cs`** (~80 lines) - Rendering: how points become visible
4. **`PointSetManager.cs`** (~850 lines) - Orchestration: loads files and creates renderers
5. **`CriticalStripRenderer.cs`** (~1600 lines) - View controller: handles pan/zoom
6. **`PointSetInteractionHandler.cs`** (~250 lines) - Interaction: clicks and hover

**Why this order?** Each file builds on concepts from the previous ones, starting with simple data structures and ending with complex event handling.

---

## Level 1: Understanding the Data Flow

### What Happens When You Load a Point Set?

```
User selects "zeta-zeros.csv" in dropdown
    ↓
PointSetManager reads the CSV file
    ↓
Creates a PointSet object with raw data (stored as doubles for precision)
    ↓
Chunks data into batches of 5,000 points (Unity vertex limit)
    ↓
Creates PointsMeshRenderer instances (one per chunk)
    ↓
Each renderer converts points to viewport coordinates
    ↓
Points appear on screen as a mesh
```

**In plain terms**: The system breaks large point sets into digestible chunks (like pagination), converts mathematical coordinates to screen pixels, and renders them efficiently as a single mesh instead of thousands of individual game objects.

`★ Insight ─────────────────────────────────────`
**Why 5,000 points per mesh?** Unity's default mesh uses 16-bit indices, limiting it to 65,535 vertices. Since each point needs 4 vertices (a quad), we can fit ~16,000 points per mesh. We use 5,000 for safety and to keep individual meshes performant during viewport changes.
`─────────────────────────────────────────────────`

---

## Level 2: The Core Concepts

### 1. The Three Coordinate Spaces

The system juggles three different coordinate systems:

#### **Critical Strip Space** (Mathematical)
- **X-axis**: Real values, typically [0, 1] but can extend to [-4.5, 5.5]
- **Y-axis**: Either **Index** values (0, 1, 2, ...) OR **Imaginary** values (14.13, 21.02, ...)
- This is where your mathematical data lives

#### **Viewport Space** (UI Local)
- Pixel coordinates relative to the visualization panel
- Example: (250px, 400px) within the panel's bounds
- This is where Unity UI elements are positioned

#### **Screen Space** (Global)
- Absolute pixel coordinates from mouse/touch input
- Example: (1024px, 768px) on a 1920x1080 display
- This is what you get from Unity's Input system

**All conversions happen through `CriticalStripTransform`** (`CriticalStripTransform.cs`):

```csharp
// Example from CriticalStripTransform.cs:69-104
public Vector2 StripToViewport(Vector2 stripPos)
{
    // Convert mathematical coordinates to screen pixels
    // Handles both Index and Imaginary space automatically
}
```

**What this does**: Takes a point like (0.5, 14.13) in mathematical space and converts it to (250px, 400px) on your screen, accounting for the current zoom level and pan offset.

**How it works**: It normalizes the mathematical coordinates based on the current visible range, multiplies by the viewport dimensions, and adjusts for the viewport's position. The snap-to-critical-line logic ensures points within 3 pixels of x=0.5 are snapped exactly to that value.

**Check your understanding:**
- Strip Space = where the math lives (real values, index/imaginary)
- Viewport Space = where UI elements are positioned (local pixels)
- Screen Space = raw input coordinates (global pixels)
- CriticalStripTransform handles all conversions between these spaces

### 2. Dual Coordinate System (Index ↔ Imaginary)

This is unique and important! The y-axis can display in **two different modes**:

#### **Index Space** (Default)
- Direct sequential numbering: 0, 1, 2, 3, 4, ...
- Easy to understand, evenly spaced
- Example: "The 5th zero" is at index 5

#### **Imaginary Space** (Advanced)
- The actual imaginary part values: 14.13, 21.02, 25.01, ...
- Shows the true mathematical spacing (non-uniform!)
- Example: Zero #1 is at t=14.13, zero #2 is at t=21.02

**The key insight**: Both representations show the same data, just with different y-axis scales. The system maintains both values simultaneously and can switch between them live.

From `CriticalStripTransform.cs:7-11`:
```csharp
private double minIndex;   // Index bounds (e.g., 0 to 10)
private double maxIndex;
private double minImag;    // Corresponding imaginary bounds (e.g., 14.13 to 49.77)
private double maxImag;
private bool useImaginarySpace = false; // Which one to display
```

**In plain terms**: It's like having a ruler marked in both centimeters and inches. Both measurements are valid, they're just different ways to measure the same thing. The system tracks both simultaneously so switching between them is instant.

`★ Insight ─────────────────────────────────────`
**Conversion functions** in `Zeta.cs` (not in critical-strip folder):
- `Zeta.IndexToImag(index)` - Convert index → imaginary value
- `Zeta.ImagToIndex(imag)` - Convert imaginary → index value

These maintain the relationship between the two coordinate systems. When you switch spaces, the viewport range is converted using these functions to show the equivalent region.
`─────────────────────────────────────────────────`

### 3. Mesh-Based Rendering

Instead of creating individual GameObjects for each point (extremely slow), we use **mesh generation**:

From `PointsMeshRenderer.cs:28-65`:
```csharp
protected override void OnPopulateMesh(VertexHelper vh)
{
    // For each point, create a quad (4 vertices, 2 triangles)
    for (int i = 0; i < Points.Count; i++)
    {
        Vector2 center = Points[i];
        // Skip off-screen points (frustum culling)
        if (center.x + halfSize < r.xMin || ...) continue;

        // Create quad vertices
        vh.AddVert(bottomLeft, color, uv);
        // ... add 3 more vertices ...

        // Create triangles from vertices
        vh.AddTriangle(indexOffset, indexOffset + 1, indexOffset + 2);
        vh.AddTriangle(indexOffset, indexOffset + 2, indexOffset + 3);
    }
}
```

**What this does**: Creates a single mesh containing thousands of points, each rendered as a tiny square (quad). Unity draws all points in one batch instead of thousands of separate draw calls.

**How it works**: Unity's `MaskableGraphic` system calls `OnPopulateMesh` whenever the mesh needs updating. We populate it with quads (two triangles each), performing frustum culling to skip points outside the visible area. All visible points get batched into a single draw call.

**Performance impact**: Rendering 100,000 points as GameObjects = ~100,000 draw calls + massive memory. Rendering as mesh = 1 draw call + minimal memory.

---

## Level 3: The Component Breakdown

### Component 1: PointSet (The Data Container)

**Location**: `Assets/app/critical-strip/PointSet.cs`

**What it does**: Stores point data with full double precision and metadata.

```csharp
// From PointSet.cs:4-21
public class Point
{
    public double Real { get; private set; }      // Full precision: 0.500000000000000
    public double Index { get; private set; }     // Full precision: 14.134725141734693
}

public class PointSet
{
    public string Name { get; private set; }      // "zeta-zeros"
    public Color Color { get; private set; }      // #FF0000 (red)
    public bool SkipCriticalLine { get; private set; }  // Optimization flag
    public float PointSize { get; private set; }  // Visual size in pixels
    private List<Point> points;                   // The actual data
}
```

**In plain terms**: This is just a labeled container. Like a spreadsheet with a name, color coding, and rows of (real, index) values. The "skip critical line" flag tells the loader to ignore points too close to x=0.5 (optimization for dense datasets).

**Key methods**:
- `AddPoint(double real, double index)` - Store a new point (PointSet.cs:45)
- `OriginalPoints` property - Access raw double-precision data (PointSet.cs:59)
- `FromFile(string filename)` - Load from CSV format (PointSet.cs:61)

### Component 2: CriticalStripTransform (The Coordinate Converter)

**Location**: `Assets/app/critical-strip/CriticalStripTransform.cs`

**What it does**: Converts between mathematical coordinates and screen pixels, handling both Index and Imaginary space.

**Key properties**:
```csharp
// Current visible range (maintained in parallel for both systems)
public float MinIndex / MaxIndex  // Index space bounds
public float MinImag / MaxImag    // Imaginary space bounds
public bool UseImaginarySpace     // Which system is active
public RectTransform ViewportRect // The UI panel dimensions
```

**Key methods**:
```csharp
StripToViewport(Vector2 stripPos) → Vector2      // Math → Pixels (line 69)
ViewportToStrip(Vector2 viewportPos) → Vector2   // Pixels → Math (line 107)
ScreenToStrip(Vector2 screenPos) → Vector2       // Input → Math (line 154)
SetRange(float min, float max)                   // Update visible range (line 170)
```

**Special feature: Critical Line Snapping** (lines 14-37):
```csharp
// Any point within 3 pixels of x=0.5 snaps to exactly 0.5
public float CriticalValueThreshold => CRITICAL_LINE_PIXELS / viewportRect.rect.width;
```

**Why this matters**: Floating-point math can introduce tiny errors. Without snapping, points meant to be on the critical line (x=0.5) might appear slightly off. The 3-pixel threshold gives users a forgiving click target.

**In plain terms**: This class is like a GPS translator. It knows where you are in "math world" (strip coordinates) and where that point should appear on your screen (viewport coordinates), accounting for zoom level, pan offset, and which coordinate system you're using.

### Component 3: PointsMeshRenderer (The Renderer)

**Location**: `Assets/app/critical-strip/PointsMeshRenderer.cs`

**What it does**: Converts a list of viewport coordinates into a visible mesh of points.

**How it works**:
1. Inherits from Unity's `MaskableGraphic` (gets free UI integration)
2. Overrides `OnPopulateMesh` to generate custom geometry
3. For each point in the `Points` list:
   - Creates 4 vertices (corners of a square)
   - Creates 2 triangles (two halves of the square)
   - Performs frustum culling (skips off-screen points)

**Performance optimizations** (lines 42-48):
```csharp
// Skip points outside viewport (with buffer for point size)
if (center.x + halfSize < r.xMin || center.x - halfSize > r.xMax ||
    center.y + halfSize < r.yMin || center.y - halfSize > r.yMax)
{
    continue; // Don't create vertices for this point
}
```

**In plain terms**: Imagine stamping thousands of tiny square stamps onto a canvas, but only stamping in the visible area. That's what this does, but in 3D graphics space using triangles instead of stamps.

**Important**: This component is **non-interactive** by design. It sets `raycastTarget = false` (line 75) so mouse events pass through it to the interaction handler below.

### Component 4: PointSetManager (The Orchestrator)

**Location**: `Assets/app/critical-strip/PointSetManager.cs`

**What it does**: Loads CSV files, creates point sets, instantiates mesh renderers, and manages the lifecycle of all visualized data.

**Responsibilities**:
1. **File I/O**: Read CSV files from `Assets/Resources/CriticalStripPoints/`
2. **Data parsing**: Parse metadata headers (#@name, #@color, #@pointSize)
3. **Optimization**: Apply critical line filtering and sampling
4. **Chunking**: Split large sets into 5,000-point batches
5. **Mesh creation**: Instantiate PointsMeshRenderer for each chunk
6. **Interaction setup**: Create and configure PointSetInteractionHandler

**CSV File Format** (parsed in lines 94-156):
```
#@name: Zeta Zeros
#@color: #FF0000AA
#@skipCriticalLine: false
#@samplingInterval: 1
#@pointSize: 4
0.5,14.134725141734693
0.5,21.022039638771554
...
```

**Key workflow** (LoadPointSet method, lines 259-471):

```
1. Read CSV file → string[]
2. Parse metadata → PointSetMetadata struct
3. Create PointSet object
4. For each data line:
   - Parse real, index values
   - Apply skipCriticalLine filter (if enabled)
   - Apply sampling (if interval > 1)
   - Add to PointSet
5. Create parent GameObject for organization
6. Chunk points into 5,000-point batches
7. For each chunk:
   - Instantiate PointsMeshRenderer
   - Convert points to viewport coordinates
   - Assign to mesh renderer
8. Add PointSetInteractionHandler to parent
9. Create dedicated hover point GameObject
```

**In plain terms**: The manager is like a librarian. When you ask for a book (point set), it finds the file, reads it, organizes the data into manageable sections, creates the display components, and sets up the interaction handlers so you can click on things.

`★ Insight ─────────────────────────────────────`
**Chunking strategy** (lines 425-458): Large point sets are split into multiple meshes because:
1. Unity's default mesh indexing uses 16-bit integers (max 65,535 vertices)
2. Each point = 4 vertices, so max ~16,000 points per mesh
3. We use 5,000 for performance (smaller meshes = faster updates during pan/zoom)
4. Each chunk gets its own PointsMeshRenderer instance
`─────────────────────────────────────────────────`

### Component 5: CriticalStripRenderer (The View Controller)

**Location**: `Assets/app/critical-strip/CriticalStripRenderer.cs`

**What it does**: Manages the viewport, handles pan/zoom input, renders auxiliary UI (critical line, position indicator), and broadcasts viewport change events.

**⚠️ Important**: Despite the name, this component **no longer renders points directly**. That's handled by PointSetManager and PointsMeshRenderer. This is a **view controller** that manages the viewport transform.

**Responsibilities**:

1. **Input handling**:
   - Mouse wheel → Zoom (OnScroll, line 1045)
   - Drag → Pan (OnDrag, line 1123)
   - Click → Select point (OnPointerClick, line 573)

2. **Viewport management**:
   - Maintains CriticalStripTransform
   - Broadcasts OnViewportChanged event when range changes
   - Enforces minimum bounds (can't scroll below index -1)

3. **Auxiliary rendering**:
   - Critical line (vertical line at x=0.5, lines 1258-1278)
   - Current position indicator (blinking dot, lines 901-987)

4. **Space mode switching**:
   - ToggleSpaceMode() switches between Index ↔ Imaginary (lines 1510-1597)
   - RefreshAllPointSets() rebuilds all points after switch (lines 1461-1508)

**Key event**: `OnViewportChanged` (line 85)
- Fired whenever zoom or pan occurs
- PointSetManager subscribes (line 648) → UpdatePointPositions()
- IndexLabelsRenderer subscribes → Updates axis labels
- This is the **event-driven architecture** core

**Zoom-to-mouse behavior** (OnScroll, lines 1045-1112):
```csharp
// Get mouse position BEFORE zoom
var mouseStripPos = criticalStripTransform.ScreenToStrip(eventData.position);

// Calculate new range keeping mouse position stable
float mouseOffset = (mouseStripPos.y - currentCenter) / currentRange;
float newCenter = mouseStripPos.y - (mouseOffset * newRange);
```

**What this does**: When you scroll to zoom, the point under your mouse cursor stays in the same screen position. This feels natural (like Google Maps).

**In plain terms**: This component is the camera operator. It doesn't draw the scene itself, but it controls what part of the scene you're looking at, handles your zoom and pan commands, and tells everyone else "hey, the view changed, update yourselves."

### Component 6: PointSetInteractionHandler (The Input Layer)

**Location**: `Assets/app/critical-strip/PointSetInteractionHandler.cs`

**What it does**: Intercepts mouse events, finds the closest point across all active sets, and handles hover animations.

**Why this exists**: The PointsMeshRenderer is non-interactive (for performance). This component sits **on top** as an invisible overlay to capture input.

**Architecture** (setup in PointSetManager.cs:375-397):
```
Parent GameObject (set name + "_group")
├─ Image (transparent, raycastTarget=true)  ← Captures input
├─ PointSetInteractionHandler ← This component
├─ PointsMeshRenderer instances ← Non-interactive meshes
└─ HoverPoint GameObject ← Animated on hover
```

**Key workflow** (OnPointerMove, lines 72-192):
```
1. Convert screen coordinates to viewport coordinates
2. For each active point set:
   - For each point in set:
     - Convert point to viewport coordinates
     - Calculate distance to mouse
3. Find closest point within threshold
4. If found:
   - Position hoverPoint at that location
   - Update color to match point's set
   - Animate scale (bounce effect)
5. If not found:
   - Hide hoverPoint
```

**In plain terms**: This is like a motion detector overlay. The actual points are a painted image (the mesh), but this transparent layer detects when your mouse is near a point and displays a separate animated indicator to show you what you're hovering over.

**Special feature**: Command/Ctrl key snapping (lines 165-191)
```csharp
// When holding Cmd/Ctrl, snap to nearest point with x-coordinate binned to 0 or 1
if (Input.GetKey(KeyCode.LeftCommand) || Input.GetKey(KeyCode.LeftControl))
{
    stripPos.x = stripPos.x < 0.5f ? 0 : 1;  // Snap to edge
    // Find closest point and set App.Real/Index
}
```

This allows quick selection of points on the left or right edges of the critical strip.

---

## Level 4: The Event Flow

### Viewport Change Event Flow

```
User scrolls mouse wheel
    ↓
CriticalStripRenderer.OnScroll()
    ↓
Calculate new zoom level
    ↓
CriticalStripTransform.SetRange(newMin, newMax)
    ↓
UpdateAllPoints() [legacy, now mostly empty]
    ↓
OnViewportChanged event fires
    ↓
    ├─→ PointSetManager.UpdatePointPositions()
    │       ├─ Convert points to new viewport coords
    │       └─ Update each PointsMeshRenderer
    │
    ├─→ IndexLabelsRenderer.UpdateLabels()
    │       └─ Redraw axis labels
    │
    └─→ Other subscribers...
```

**In plain terms**: When you zoom or pan, the renderer calculates the new mathematical range, then broadcasts "the view changed!" All interested components update themselves accordingly. It's like a group text notification.

### Point Click Event Flow

```
User clicks on screen
    ↓
PointSetInteractionHandler.OnPointerClick()
    ↓
Convert screen coords to viewport coords
    ↓
For each active point set:
    For each point:
        Calculate distance to click
    ↓
Find closest point within threshold
    ↓
If found:
    App.Real = point.Real
    App.Index = point.Index
    ↓
App fires RealChanged and IndexChanged events
    ↓
CriticalStripRenderer.OnRealChanged() / OnIndexChanged()
    ↓
UpdateCurrentPosIndicator()
    ↓
Position indicator moves to new location
```

**In plain terms**: Clicking triggers a search through all visible points to find the closest one. If found, the app's current position is updated, which moves the position indicator and triggers any other listeners.

### Space Mode Toggle Event Flow

```
User clicks "Toggle Space" button
    ↓
CriticalStripRenderer.ToggleSpaceMode()
    ↓
Store current viewport range
    ↓
Toggle UseImaginarySpace flag
    ↓
Convert range to new coordinate system
    ↓
CriticalStripTransform.SetRange(converted range)
    ↓
RefreshAllPointSets()
    ├─ RemovePointSet() for each set
    │   └─ Destroy old mesh renderers
    │
    └─ AddPointSetInternal() for each set
        └─ Create new mesh renderers with converted coords
    ↓
OnViewportChanged event fires
    ↓
IndexLabelsRenderer updates to new space mode
```

**In plain terms**: Switching spaces is like changing the units on your ruler from inches to centimeters. All the points stay in the same physical locations, but their y-coordinates are recalculated and the axis labels change.

---

## Level 5: Common Tasks

### Task 1: Adding a New Point Set File

1. Create a CSV file in `Assets/Resources/CriticalStripPoints/`
2. Add metadata headers:
```csv
#@name: My Custom Points
#@color: #00FF00FF
#@skipCriticalLine: false
#@samplingInterval: 1
#@pointSize: 6
0.3,14.134
0.7,21.022
...
```
3. In Unity, the dropdown auto-populates from files in the directory
4. Select your point set → it loads automatically

**Location references**:
- Metadata parsing: `PointSetManager.ParsePointSetMetadata()` (lines 104-156)
- File loading: `PointSetManager.LoadPointSet()` (lines 259-471)

### Task 2: Modifying Coordinate Conversions

All coordinate math is in `CriticalStripTransform.cs`:

- **Strip → Viewport**: Line 69 (`StripToViewport`)
- **Viewport → Strip**: Line 107 (`ViewportToStrip`)
- **Screen → Strip**: Line 154 (`ScreenToStrip`)

**Example modification**: Change snap threshold
```csharp
// Line 32: Increase snap distance to 5 pixels
private const float CRITICAL_LINE_PIXELS = 5f;
```

### Task 3: Adding New Visualizations

Want to draw additional overlays (like the critical line)?

1. Create a new GameObject in `CriticalStripRenderer.Start()`
2. Use the transform for coordinate conversion:
```csharp
Vector2 stripPos = new Vector2(myReal, myIndex);
Vector2 viewportPos = criticalStripTransform.StripToViewport(stripPos);
myGameObject.GetComponent<RectTransform>().anchoredPosition = viewportPos;
```
3. Subscribe to `OnViewportChanged` to update when view changes

**Example**: The critical line initialization (lines 1258-1278)

### Task 4: Debugging Coordinate Issues

**Common issue**: Points appear in wrong locations

**Debug checklist**:
1. Check which space mode is active (Index vs Imaginary)
2. Verify raw data in `PointSet.OriginalPoints` (double precision)
3. Check conversion in `PointSetManager.LoadPointSet()` (lines 406-414)
4. Verify viewport bounds in `CriticalStripTransform` (MinValue/MaxValue)
5. Check mesh population in `PointsMeshRenderer.OnPopulateMesh()`

**Add debug logging**:
```csharp
// In PointSetManager.LoadPointSet(), line 411
Debug.Log($"Point {i}: Strip({stripPos}) → Viewport({viewportPos})");
```

### Task 5: Optimizing Performance

**Current optimizations**:
- ✅ Mesh-based rendering (PointsMeshRenderer)
- ✅ Frustum culling (PointsMeshRenderer.cs:42-48)
- ✅ Critical line filtering (PointSetManager.cs:313-321)
- ✅ Sampling intervals (PointSetManager.cs:327-331)
- ✅ Chunking to 5,000 points per mesh

**If still slow**:
1. **Increase sampling interval**: Use `#@samplingInterval: 2` in CSV (every other point)
2. **Enable critical line skip**: Use `#@skipCriticalLine: true` for dense sets
3. **Reduce point size**: Smaller quads = less fill rate
4. **Profile mesh generation**: Check `OnPopulateMesh` call frequency

---

## Key Design Decisions

### Why Separate Interaction Handler from Renderer?

**Problem**: Unity UI's `Graphic` components (like `MaskableGraphic`) can't easily handle per-point interactions when rendering thousands of points as a single mesh.

**Solution**: Separate the concerns:
- `PointsMeshRenderer` = pure rendering (non-interactive)
- `PointSetInteractionHandler` = transparent overlay (captures input)

**Benefit**: Renderer can be optimized for drawing, handler can search through data for clicks.

### Why Maintain Both Index and Imaginary Bounds?

**Problem**: Converting between Index ↔ Imaginary is expensive if done repeatedly during pan/zoom.

**Solution**: Store both simultaneously (CriticalStripTransform.cs:6-9):
```csharp
private double minIndex;
private double maxIndex;
private double minImag;
private double maxImag;
```

Update both when range changes (lines 177-196).

**Benefit**: Switching spaces is instant (no recalculation), and both sets of bounds are always available.

### Why Event-Driven Architecture?

**Alternative**: PointSetManager could directly call CriticalStripRenderer, IndexLabelsRenderer, etc.

**Problem**: Tight coupling, hard to add new components.

**Solution**: `OnViewportChanged` event (CriticalStripRenderer.cs:85):
```csharp
public event System.Action OnViewportChanged;
```

**Benefit**: New components can subscribe without modifying existing code. Clean separation of concerns.

---

## Troubleshooting Guide

### Issue 1: "Points not appearing after loading CSV"

**Cause**: Points might be outside the current viewport range.

**Solution**:
1. Check CSV values - are they in a reasonable range?
2. In Unity, check CriticalStripRenderer's current MinIndex/MaxIndex
3. Use the "Center" button to reset viewport
4. Check Console for loading errors from PointSetManager

**File reference**: `PointSetManager.LoadPointSet()` logs statistics (line 342)

### Issue 2: "Hover animation feels sluggish"

**Cause**: Animation is tied to frame rate via `Time.deltaTime`.

**Solution**: Adjust animation duration:
```csharp
// In PointSetInteractionHandler.cs:16
[SerializeField] private float hoverAnimationDuration = 0.3f; // Reduce to 0.15f
```

**File reference**: `PointSetInteractionHandler.AnimateHoverScale()` (lines 194-232)

### Issue 3: "Points disappear when zooming in imaginary space"

**Cause**: Range conversion might push min below allowed threshold.

**Solution**: Check minimum allowed imaginary value:
```csharp
// CriticalStripRenderer.OnScroll(), lines 1080-1088
float minAllowedImag = (float)Zeta.IndexToImag(-1f);
if (newMin < minAllowedImag) {
    // Clamp to minimum
}
```

The system enforces a minimum to prevent invalid conversions.

### Issue 4: "UI feels unresponsive during heavy interaction"

**Cause**: Too many points loaded, mesh regeneration is slow.

**Solution**:
1. Enable critical line skip: `#@skipCriticalLine: true`
2. Use sampling: `#@samplingInterval: 2` or higher
3. Check Stats display - if > 500k points, consider optimizing
4. Profile `OnPopulateMesh` calls in Unity Profiler

---

## Architecture Diagrams

### Component Hierarchy

```
CriticalStripRenderer (View Controller)
│
├─ CriticalStripTransform (Coordinate System)
│   ├─ Tracks viewport bounds
│   ├─ Handles Index ↔ Imaginary conversion
│   └─ Provides coordinate conversion methods
│
├─ Critical Line (Visual Element)
│   └─ Vertical line at x=0.5
│
├─ Current Position Indicator (Visual Element)
│   └─ Blinking dot at App.Real/Index
│
└─ OnViewportChanged Event
    └─ Notifies subscribers when view changes

PointSetManager (Data Orchestrator)
│
├─ Loads CSV files
├─ Creates PointSet objects
│
└─ For each PointSet:
    │
    ├─ Parent GameObject (groupName_group)
    │   │
    │   ├─ PointSetInteractionHandler (Input Layer)
    │   │   │
    │   │   └─ HoverPoint (Animated Indicator)
    │   │
    │   └─ PointsMeshRenderer instances (Rendering)
    │       ├─ Chunk 0 (0-4,999 points)
    │       ├─ Chunk 1 (5,000-9,999 points)
    │       └─ ...
    │
    └─ Subscribes to OnViewportChanged
        └─ Updates mesh coordinates on view change
```

### Data Flow: Loading a Point Set

```
CSV File on Disk
    ↓
PointSetManager.LoadPointSet()
    ↓
ParsePointSetMetadata()
    ├─ Extract: name, color, skipCriticalLine, samplingInterval, pointSize
    └─ Return metadata struct
    ↓
Create PointSet object
    ↓
For each line in CSV:
    ├─ Parse real, index
    ├─ Apply skipCriticalLine filter (if enabled)
    ├─ Apply sampling (if interval > 1)
    └─ PointSet.AddPoint(real, index)
    ↓
Chunk into 5k-point batches
    ↓
For each chunk:
    ├─ Convert points to viewport coords
    │   └─ CriticalStripTransform.StripToViewport()
    │
    ├─ Instantiate PointsMeshRenderer
    ├─ Assign point list
    ├─ Set color, point size
    └─ Call Refresh()
        └─ OnPopulateMesh() generates mesh
    ↓
Create PointSetInteractionHandler
    ├─ Attach to parent GameObject
    ├─ Create transparent Image (raycast target)
    ├─ Create HoverPoint GameObject
    └─ Store references to manager, renderer, app
    ↓
Point set now visible and interactive
```

---

## Best Practices

### 1. Coordinate Precision

**DO**:
```csharp
// Store original data as double
pointSet.AddPoint(real, index);  // doubles preserved

// Convert to float only for rendering
Vector2 viewportPos = transform.StripToViewport(new Vector2((float)point.Real, (float)point.Index));
```

**DON'T**:
```csharp
// Lose precision early
float real = (float)realDouble;  // Precision lost!
pointSet.AddPoint(real, index);
```

**Why**: Mathematical data (especially zeta zeros) requires high precision. Only convert to float at the rendering stage.

### 2. Event Subscriptions

**DO**:
```csharp
private void Start()
{
    criticalStripRenderer.OnViewportChanged += UpdatePoints;
}

private void OnDestroy()
{
    criticalStripRenderer.OnViewportChanged -= UpdatePoints;  // Clean up!
}
```

**DON'T**:
```csharp
// Forget to unsubscribe → memory leaks
private void Start()
{
    criticalStripRenderer.OnViewportChanged += UpdatePoints;
}
// No OnDestroy → event still references destroyed object
```

### 3. Mesh Updates

**DO**:
```csharp
// Batch updates
meshRenderer.Points = newPointsList;
meshRenderer.color = newColor;
meshRenderer.PointSize = newSize;
meshRenderer.Refresh();  // Single update
```

**DON'T**:
```csharp
// Trigger multiple rebuilds
meshRenderer.PointSize = newSize;  // Mesh rebuild!
meshRenderer.color = newColor;     // Mesh rebuild!
meshRenderer.Refresh();            // Mesh rebuild!
```

**Why**: Each property change can trigger `SetVerticesDirty()`. Batch changes and call `Refresh()` once.

### 4. Coordinate Conversions

**DO**:
```csharp
// Use the transform methods
Vector2 viewportPos = transform.StripToViewport(stripPos);
```

**DON'T**:
```csharp
// Manual math (error-prone, doesn't account for snap logic)
float x = stripPos.x * viewportRect.rect.width;
float y = (stripPos.y - minIndex) / (maxIndex - minIndex) * viewportRect.rect.height;
```

**Why**: `CriticalStripTransform` handles edge cases (snap-to-critical-line, extended ranges, imaginary space).

---

## Further Reading

- **Main README**: `/Assets/app/critical-strip/README.md` - High-level overview
- **Unity UI Reference**: Unity's `MaskableGraphic` and `VertexHelper` APIs
- **Riemann Zeta Function**: Background on the mathematical domain
- **Project CLAUDE.md**: `/Users/chris/pasta/zest/CLAUDE.md` - Overall project architecture

---

## Quick Reference

### Key Files by Size

| File | Lines | Complexity | Start Here? |
|------|-------|-----------|-------------|
| PointSet.cs | 130 | ⭐ Simple | ✅ Yes - data structures |
| PointsMeshRenderer.cs | 80 | ⭐⭐ Medium | ✅ Yes - rendering basics |
| CriticalStripTransform.cs | 230 | ⭐⭐⭐ Complex | After PointSet |
| PointSetInteractionHandler.cs | 250 | ⭐⭐ Medium | After Transform |
| PointSetManager.cs | 850 | ⭐⭐⭐⭐ Very Complex | After Handler |
| CriticalStripRenderer.cs | 1634 | ⭐⭐⭐⭐⭐ Most Complex | Last |

### Common Locations

| What | Where |
|------|-------|
| Coordinate conversions | CriticalStripTransform.cs (methods at lines 69, 107, 154) |
| CSV parsing | PointSetManager.cs:104-156 |
| Mesh generation | PointsMeshRenderer.cs:28-65 |
| Point click handling | PointSetInteractionHandler.cs:26-69 |
| Zoom implementation | CriticalStripRenderer.cs:1045-1112 |
| Pan implementation | CriticalStripRenderer.cs:1123-1173 |
| Space toggle | CriticalStripRenderer.cs:1510-1597 |

---

**Welcome aboard!** Start with `PointSet.cs`, work your way through the files in order, and refer back to this guide when you need context. The system is sophisticated but well-structured - each component has a clear, single responsibility.
