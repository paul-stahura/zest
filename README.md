# Zeta Visualization Project

A Unity-based mathematical visualization tool for exploring the Riemann Zeta function and related mathematical concepts. The project uses an orthogonal camera to view complex mathematical patterns in a 2D space (X/Y plane), with camera controls for panning and zooming.

## Project Structure

### Assets/math/
Core mathematical implementations:
- `Zeta.cs` - Primary implementation of Riemann Zeta function calculations including:
  - Euler-Maclaurin summation
  - Riemann-Siegel formula
  - Eta formula
  - Various helper functions for zeta calculations
  - Spiral class for visualization calculations
- `Vector.cs` - Custom 2D vector implementation with complex number support
- `Circle.cs` - Circle geometry calculations
- `Line.cs` - Line geometry and calculations
- `Matrix.cs` - Matrix operations for transformations
- `Extensions.cs` - Utility extension methods

### Assets/app/
Visualization components and Unity-specific implementations:

#### Core Components
- `App.cs` - Main application controller
- `SpiralCalculator.cs` - Handles spiral calculations and updates (see detailed section below)
- `SpiralRenderer.cs` - Renders spirals using the Shapes library (see detailed section below)
- `ZetaSpiral.cs` - Zeta function spiral visualization

#### Visualization Features
- `SymmetryRenderer.cs` - Renders symmetrical patterns
- `YinYangRenderer.cs` - Specialized renderer for yin-yang patterns
- `ZetaCircles.cs` - Circle-based zeta visualizations
- `RhombusPoints.cs` - Rhombus pattern visualization
- `ClockPoints.cs` - Clock-like point arrangements
- `WindowPoints.cs` - Window-based point arrangements

#### Camera and UI
- `CameraPositionTracking.cs` - Handles camera movement tracking
- `CameraTracking.cs` - Camera behavior and controls
- `MultiOptionToggle.cs` - UI toggle for multiple options
- `OnMouseOverDescription.cs` - Mouse hover descriptions
- `UIOptions.cs` - UI configuration options

#### Mathematical Visualizations
- `NewRiemmanSeigalFormulaSums.cs` - Riemann-Siegel formula calculations
- `BisectorPoint.cs` - Bisector point calculations
- `MiddleLinkTeardrop.cs` - Teardrop pattern visualization
- `EulersProduct.cs` - Euler product visualization
- `SpiralGramPoints.cs` - Gram point visualization
- `ThreePointCircle.cs` - Three-point circle calculations

#### Utility Components
- `ColorInverter.cs` - Color manipulation
- `DFold.cs` - Folding operations
- `LinkSort.cs` - Link sorting utilities
- `SegmentMarks.cs` - Segment marking utilities
- `Manual.cs` - Manual controls and documentation

### External Dependencies
- Shapes Library - Used for immediate mode drawing
- Unity Engine - Core framework

### Data Files
- `primes.csv` - Prime number data
- `zeta-zeros-100k.txt` - Zeta function zeros data

## Key Features
1. Interactive visualization of the Riemann Zeta function
2. Multiple visualization methods:
   - Spirals
   - Circles
   - Symmetrical patterns
   - Teardrop patterns
3. Camera controls for exploration
4. Various mathematical calculations and transformations
5. Real-time rendering using the Shapes library

## Technical Notes
- Uses immediate mode rendering for efficient visualization
- Implements custom mathematical operations for precision
- Provides multiple formula implementations for comparison
- Supports both analytical and numerical approaches
- Camera system optimized for 2D mathematical exploration

## Implementation Details
The project uses a combination of:
- Custom mathematical implementations in C#
- Unity's rendering pipeline
- Immediate mode drawing via Shapes library
- Custom vector and matrix operations
- Complex number calculations
- Various mathematical formulas and transformations

## Key Components In Detail

### SpiralCalculator.cs
The SpiralCalculator is a central component that manages all mathematical calculations for various spiral visualizations. 

#### Key Responsibilities:
1. **Spiral Management**
   - Maintains different spiral types:
     - Euler-Maclaurin (EMS) spiral
     - Riemann-Siegel (ZRS) spiral
     - Eta spiral
     - Inverse sum spiral
     - Chi spiral
   - Handles spiral updates based on index and real value changes

2. **Calculation Types**
   - Forward calculations (standard spirals)
   - Inverse calculations (reflected spirals)
   - Bisector calculations
   - Real path calculations
   - Symmetry point calculations
   - Yin-Yang calculations

3. **Event System**
   - Uses C# events for notifying visualization updates
   - Manages subscriptions for different visualization types
   - Provides centralized calculation state management

4. **Caching System**
   - Implements lazy calculation pattern
   - Caches results until parameters change
   - Recalculates only when necessary

5. **Mathematical Operations**
   - Handles intersection calculations
   - Performs reflection operations
   - Calculates chi function values
   - Manages spiral joint positions

### SpiralRenderer.cs
The SpiralRenderer handles the visual representation of all spiral calculations using the Shapes library for immediate mode drawing.

#### Key Features:
1. **Rendering System**
   - Implements ImmediateModeShapeDrawer
   - Handles volumetric 3D line geometry
   - Manages pixel-space thickness
   - Supports local space transformations

2. **Visualization Types**
   - EMS (Euler-Maclaurin Summation) spiral
   - ZRS (Riemann-Siegel) spiral
   - Reverse spiral
   - Inverse spiral
   - Chi spiral
   - Eta spiral
   - Real path visualization

3. **UI Integration**
   - Multiple toggle options for different spiral types
   - Color customization for different spiral components
   - Transparency and visibility controls
   - Link visualization options

4. **Drawing Features**
   - Spiral line drawing with customizable thickness
   - Bisector link highlighting
   - Clock arm visualization
   - Color tinting and alpha blending
   - Path drawing with different styles

5. **Subscription System**
   - Manages subscriptions to SpiralCalculator events
   - Updates visualizations based on calculation changes
   - Handles UI toggle state changes

#### Visualization Options:
- **Spiral Types**
  - Forward spirals (EMS, ZRS)
  - Reverse spirals
  - Inverse spirals
  - Reflected spirals
  - Chi spirals
  - Eta spirals

- **Display Options**
  - All links
  - Bisector link only
  - Clock visualization
  - Real path
  - Color-coded links

- **Style Controls**
  - Line thickness
  - Color and transparency
  - Highlight effects
  - Clock arm styling

These two components work together to create a robust visualization system:
- SpiralCalculator performs all mathematical operations and maintains state
- SpiralRenderer subscribes to calculator events and handles visual representation
- The combination provides real-time, interactive visualization of complex mathematical concepts

This visualization tool serves as an interactive way to explore and understand complex mathematical concepts, particularly focusing on the Riemann Zeta function and its properties. 