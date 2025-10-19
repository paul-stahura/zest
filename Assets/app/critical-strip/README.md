## Critical Strip Visualization System

### Overview

Unity UI system for rendering and interacting with points in the Riemann zeta function’s critical strip. The current implementation separates view control, coordinate transforms, rendering, and interaction to keep panning/zooming smooth on large datasets, while enabling precise point selection and labeling.

Key capabilities
- Dual-space Y axis: toggle between Index and Imaginary t values
- Real-axis extension when the window is extended (view > [0,1])
- Mesh-based rendering with off-screen culling and chunking
- Hover and click over non-raycasting meshes via a transparent overlay
- Snap-to-critical-line within a 3‑pixel threshold

### Components and responsibilities

- CriticalStripRenderer (View Controller)
  - Handles pan (drag), zoom (scroll), and emits OnViewportChanged
  - Owns CriticalStripTransform and exposes it via GetTransform()
  - Draws a vertical critical line at real = 0.5 and a blinking current-position indicator
  - Provides “space toggle” (Index/Imag) and a center button; long‑press center to lock auto-centering
  - Supports extended real axis when the window is extended
  - Note: It still contains legacy prefab-per-point rendering helpers, but PointSetManager uses the mesh pipeline

- CriticalStripTransform (Coordinate transforms)
  - Converts between Critical Strip space, Viewport space, and Screen space
  - Dual Y space: Index or Imaginary t (UseImaginarySpace)
  - Snap-to-line: clicks within 3 px of x = 0.5 snap to exactly 0.5
  - Real axis: default maps [0,1]; when extended, maps a wider range centered at 0.5 (e.g., [-4.5, 5.5])

- PointSetManager (Data + mesh orchestration)
  - Loads `.csv` files from `Assets/Resources/CriticalStripPoints/`
  - Parses enhanced headers: `#@name`, `#@color`, `#@skipCriticalLine`, `#@samplingInterval`, `#@pointSize`
  - Auto‑converts older files to the enhanced header format on load
  - Creates `PointsMeshRenderer` instances per set, chunked at 5,000 points per mesh
  - Adds a transparent overlay with `PointSetInteractionHandler` and a single animated “hover point”
  - Updates meshes on `OnViewportChanged`
  - Stats: updates total points based on source files’ counts

- PointsMeshRenderer (Renderer)
  - `MaskableGraphic` that generates a quad per point in `OnPopulateMesh`
  - Performs simple off‑screen culling; `raycastTarget = false`
  - One draw call per mesh; multiple meshes for large sets

- PointSetInteractionHandler (Interaction)
  - Captures pointer events over a transparent overlay
  - Searches across all active sets’ original points to find the nearest to the cursor
  - Moves/animates a single `hoverPoint` RectTransform; no mesh regeneration
  - Click updates `App.Real`/`App.Index`; holding Cmd/Ctrl biases selection toward real 0 or 1

- IndexLabelsRenderer (Axis labels)
  - Subscribes to `OnViewportChanged` and reflows labels
  - Adapts density/precision; uses `t=` prefix in imaginary space

- CriticalStripWindow (Container)
  - Collapsible/expandable window with easing
  - “Extend” mode widens the panel and extends the real axis mapping; hides collapse button while extended

- CriticalStripStats (HUD)
  - Displays the total number of points summed from source files

### Interaction and data flow
1) User pans/zooms on the viewport (CriticalStripRenderer) → CriticalStripTransform range updates → `OnViewportChanged`
2) PointSetManager recalculates viewport positions and refreshes meshes; IndexLabelsRenderer redraws labels
3) PointSetInteractionHandler performs nearest‑point hit testing across active sets; hover animates a dedicated point; click updates App

### Data files and format
- Location: `Assets/Resources/CriticalStripPoints/`
- Enhanced header keys (lines beginning with `#@`):
  - `name`, `color` (`#RRGGBBAA`), `skipCriticalLine` (bool), `samplingInterval` (int), `pointSize` (float)
- Old files are auto‑converted to include the enhanced header on load
- A “Favorites” file (`favorite-points.csv`) is created on first save via `PointSetManager.SaveCurrentPoint()` and is always reloaded after saving

### Controls (default behaviors)
- Pan: drag inside the viewport
- Zoom: mouse wheel; sensitivity adapts to Index vs Imaginary modes
- Toggle Index/Imag modes: UI button (SpaceToggleButton)
- Center on current App position: center button; long‑press to lock/unlock auto‑centering
- Extend real axis: window “extend” button (widens panel and real range)
- Click near x = 0.5: snaps to the critical line (≤ 3 px)
- Precision selection: hold Cmd/Ctrl to bias matching toward real 0 or 1

### Performance notes
- Mesh chunking at 5,000 points prevents UI vertex limits
- Off‑screen culling in `PointsMeshRenderer` reduces generated vertices
- Hover hit‑testing is linear in the number of points across active sets; for extremely large sets consider limiting active sets or increasing `samplingInterval`

### Dependencies
- Unity UI (UGUI) and EventSystem
- TextMeshPro (used by `CriticalStripStats`)
- `App` integration (reads/sets `Real` and `Index`)

### Accuracy notes vs earlier docs
- Removed references to non‑existent SETUP.md and SPECIFICATION.md
- Clarified that stats show total points in source files (not post‑sampling render count)
- Documented real‑axis extension behavior and center/lock control
- Noted the legacy prefab‑per‑point helpers in `CriticalStripRenderer` are not used by `PointSetManager`

This document reflects the current code under `Assets/app/critical-strip/`.