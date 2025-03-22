# Critical Strip Visualization Setup Guide

## 1. Point Prefab Setup

1. Create a new prefab:
   - In Project window: Right-click → Create → UI → Image
   - Name it "PointPrefab"
   - Save to `Assets/Prefabs` folder

2. Configure PointPrefab:
```
GameObject (PointPrefab)
└── Image (Component)
    ├── Source Image: None
    ├── Color: White (#FFFFFF)
    ├── Material: Default UI Material
    ├── Raycast Target: false
    └── Image Type: Simple
└── RectTransform (Component)
    ├── Anchors: Middle-Center
    ├── Pivot: (0.5, 0.5)
    ├── Position: (0, 0, 0)
    ├── Size: (4, 4)
    └── Scale: (1, 1, 1)
```

## 2. Canvas Hierarchy Setup

Create this hierarchy in your scene:

```
CriticalStripCanvas
└── CriticalStripWindow
    ├── Background Panel
    │   └── Background Image
    ├── Header
    │   ├── Toggle Button
    │   ├── Close Button
    │   └── Coordinates Text
    ├── Content
    │   ├── Point Set List
    │   │   └── Point Set Entry Template
    │   └── Point Viewport
    └── Collapse Tab
```

### Component Settings

#### CriticalStripCanvas
```
Canvas (Component)
├── Render Mode: Screen Space - Overlay
├── Pixel Perfect: true
└── Sort Order: 1

Canvas Scaler (Component)
├── UI Scale Mode: Scale With Screen Size
├── Reference Resolution: (1920, 1080)
└── Screen Match Mode: Match Width Or Height (0.5)

Graphic Raycaster (Component)
└── Default Settings
```

#### CriticalStripWindow
```
RectTransform
├── Anchors: Left-Stretch
├── Position: (0, 0, 0)
├── Width: 300
└── Height: 100% of parent

CriticalStripWindow (Script)
└── References set in inspector:
    ├── Window Content: Content
    ├── Toggle Button: Toggle Button
    └── Close Button: Close Button
```

#### Background Panel
```
RectTransform
├── Anchors: Stretch-Stretch
├── Left, Top, Right, Bottom: 0
└── Pivot: (0, 0.5)

Image (Component)
├── Color: rgba(0, 0, 0, 0.2)
└── Raycast Target: true
```

#### Header
```
RectTransform
├── Anchors: Top-Stretch
├── Height: 40
└── Pivot: (0.5, 1)

Horizontal Layout Group
├── Padding: Left(8), Right(8)
├── Spacing: 8
└── Child Controls: Width, Height

Content Size Fitter
└── Horizontal Fit: Unconstrained
```

#### Toggle/Close Buttons
```
RectTransform
├── Size: (30, 30)
└── Pivot: (0.5, 0.5)

Button (Component)
└── Default settings

Image (Component)
└── Your choice of icon
```

#### Coordinates Text
```
RectTransform
├── Size: (Flexible, 30)
└── Pivot: (0.5, 0.5)

TextMeshProUGUI (Component)
├── Text: "Real: 0.000, Index: 0.000"
├── Font Size: 14
└── Alignment: Middle Left
```

#### Content
```
RectTransform
├── Anchors: Stretch-Stretch
├── Top: 40 (below header)
└── Left, Right, Bottom: 0

Vertical Layout Group
├── Padding: All(8)
├── Spacing: 8
└── Child Controls: Width, Height
```

#### Point Set List
```
RectTransform
├── Anchors: Top-Stretch
└── Height: 120

Scroll Rect
└── Content: Point Set Entry Template

Mask
└── Default settings
```

#### Point Viewport
```
RectTransform
├── Anchors: Stretch-Stretch
└── Left, Right, Top, Bottom: 0

CriticalStripRenderer (Script)
└── Point Prefab: PointPrefab (assigned in inspector)

Mask
└── Default settings
```

#### Collapse Tab
```
RectTransform
├── Anchors: Left-Middle
├── Position: (-20, 0, 0)
└── Size: (20, 60)

Image (Component)
└── Color: rgba(0, 0, 0, 0.4)
```

## 3. Script References

1. On CriticalStripWindow component:
   - Assign Content's RectTransform to `windowContent`
   - Assign Toggle Button to `toggleButton`
   - Assign Close Button to `closeButton`

2. On CriticalStripRenderer component:
   - Assign PointPrefab to `pointPrefab`

## 4. Create Prefab

1. After setting up the entire hierarchy:
   - Drag CriticalStripCanvas from Hierarchy to Project window
   - Save in `Assets/Prefabs` folder
   - Name it "CriticalStripCanvas"

## 5. Usage in Scene

1. Add to scene:
   - Drag CriticalStripCanvas prefab into scene
   - Position it in the hierarchy above other UI elements
   - Ensure it's not blocked by other canvases

2. Test functionality:
   - Play scene
   - Verify window collapse/expand
   - Check point rendering in viewport
   - Test point hover effects

## 6. Point Set Entry Template

Create a template for point set entries in the Point Set List:

```
Point Set Entry Template (GameObject)
├── Toggle (for enabling/disabling set)
├── Text (set name)
└── Color Image (set color indicator)
```

Configure with:
```
RectTransform
├── Size: (Flexible, 30)
└── Layout: Left to right

Horizontal Layout Group
├── Spacing: 8
└── Padding: Left(4), Right(4)
```

## Troubleshooting

1. If points aren't appearing:
   - Check Point Viewport mask settings
   - Verify PointPrefab assignment
   - Ensure proper RectTransform anchoring

2. If window isn't collapsing properly:
   - Check CriticalStripWindow RectTransform settings
   - Verify button assignments
   - Check animation values

3. If coordinate transform seems off:
   - Verify Point Viewport RectTransform settings
   - Check CriticalStripTransform initialization
   - Confirm index range settings 