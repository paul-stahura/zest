# Zest Visualization Guide

This document provides a comprehensive overview of all mathematical visualizations available in Zest, organized by their purpose and the mathematical concepts they illuminate.

## Table of Contents

1. [Primary Spiral Visualizations](#primary-spiral-visualizations)
2. [Symmetry and Reflection Visualizations](#symmetry-and-reflection-visualizations)
3. [Teardrop Pattern Visualizations](#teardrop-pattern-visualizations)
4. [Remainder Function Visualizations](#remainder-function-visualizations)
5. [Critical Strip Exploration](#critical-strip-exploration)
6. [Circle-Based Visualizations](#circle-based-visualizations)
7. [Special Point Visualizations](#special-point-visualizations)
8. [Understanding the Mathematical Concepts](#understanding-the-mathematical-concepts)

---

## Primary Spiral Visualizations

### SpiralRenderer — The Main Visualization Engine

The `SpiralRenderer` is the central visualization component that displays the partial sum spiral of ζ(s) = Σ(1/nˢ). As you add terms sequentially, each 1/nˢ becomes a vector in the complex plane, and connecting these vectors creates a spiral that winds inward toward ζ(s).

#### Available Spiral Types

**Forward Spirals** (building toward ζ(s)):
- **EMS Spiral** (Euler-Maclaurin Summation) — Most accurate general-purpose formula, works at any real value σ. Uses asymptotic expansion with Bernoulli numbers for high precision.
- **ZRS Spiral** (Riemann-Siegel) — Optimized specifically for the critical line σ = 0.5. Fastest and most accurate when exploring the Riemann Hypothesis.
- **Eta Spiral** — Alternating series representation: η(s) = (1 - 2^(1-s))ζ(s). Shows how the alternating zeta function converges.

**Reflected and Inverse Spirals** (exploring symmetries):
- **Forward Reflected Spiral** — The forward spiral reflected across a symmetry axis, revealing mirror properties in the partial sum structure.
- **Reverse Spiral** — The forward spiral reflected across the zeta value itself. Shows ζ(s) = ζ(1-s) functional equation symmetry geometrically by reflecting the spiral through its endpoint.
- **Inverse Spiral** (RS Inverse Sum) — Built using the chi function χ(s) from the functional equation. Spirals from the "other side" of the functional equation symmetry.
- **Inverse Reflected Spiral** — The inverse spiral reflected through both the zeta value and perpendicular axis. Double reflection reveals deep symmetry in the functional equation.

**Zak Links** (remainder analysis):
- **Forward Zak Links** — Visualizes the Zak/Rak remainder function, which measures what's "left over" after partial summation
- **Inverse Zak Links** — The inverse version of the Zak remainder, showing the remainder from the chi function perspective

**Real Path Visualization**:
- Shows how the spiral's bisector point moves as σ (the real part) varies while t (imaginary part) stays constant
- Colored in magenta before σ=1 and blue after σ=1, showing the transition across the critical strip

#### Drawing Modes

The `SpiralRenderer` offers multiple ways to display spirals, controlled by the "Links to Draw" dropdown:

1. **ALL** — Show every link in the spiral from origin to endpoint
2. **Up to Sum1** — Display only links up to the bisector (middle point)
3. **Up to Sum1 as Vector** — Show just the vector sum to the bisector point
4. **Up to Bisector Link** — Display links up to and including the bisector link
5. **Bisector Link** — Show only the single bisector link (the "middle" of the spiral)
6. **Clock** — Display the "yin-yang" configuration: the bisector link plus two arms before and after it
7. **Last Link** — Show only the final link (the last term added to the sum)

#### Highlighting Options

**Bisector Highlighting**:
- Colors the bisector link (the middle link of the spiral) with an orange tint
- Shows the geometric center around which the spiral is balanced

**Clock Arms** (Yin-Yang Configuration):
- **Yin arm** (before bisector): Tinted green
- **Yang arm** (after bisector): Tinted red
- These four links (two before bisector, bisector itself, two after) form the "clock" that reveals angular relationships in the partial sums

#### Transparency Control

Four transparency levels affect all spiral visualizations:
- **Faded** (10%) — Very subtle, for background context
- **Light** (25%) — Gentle visibility
- **Half** (50%) — Balanced visibility
- **Full** (100%) — Maximum prominence

---

## Symmetry and Reflection Visualizations

### SymmetryRenderer — Geometric Symmetry Patterns

The `SymmetryRenderer` reveals the hidden geometric symmetries in zeta partial sums through bisector calculations, reflection patterns, and "both sums" analysis.

#### ZPS (Zeta Partial Sum) Bisector

The ZPS bisector shows the fundamental symmetry in partial sums:

- **Green leg**: From origin to bisector point (BP½)
- **Red leg**: From bisector point to ZPS (zeta partial sum)
- **Dashed bisecting line**: The perpendicular bisector between origin and ZPS/2

**Mathematical significance**: When both legs have equal length, special mathematical properties emerge. These "equal leg" configurations appear at specific index values and are related to zeros and critical points.

#### ZPS BP to Zeta Circle

A circle centered at the bisector point (BP½) with radius extending to the zeta value. This circle:
- Reveals the geometric relationship between the bisector and final sum
- Shows how the partial sum "orbits" around its geometric center
- Intersections with other circles indicate special mathematical values

#### Symmetry Point Visualization

Shows a triangle formed by:
- **Origin** (0, 0)
- **Zeta value** (ζ(s))
- **Symmetry point** (geometric reflection point)

The dashed line bisects the triangle, revealing the axis of symmetry. This visualization helps understand how the spiral's structure is balanced.

#### Symmetry Real Path

As σ (real part) varies while t (imaginary part) stays constant, the symmetry point traces a path through the complex plane. This path:
- Shows how symmetry shifts across the critical strip
- Reveals continuous deformation of geometric properties
- Helps identify where special symmetries occur (often near σ = 0.5)

#### Reverse Link (Bisector Link Reflected)

The reverse link shows what happens when you reflect the bisector link across the zeta value:
- **Yin point**: Square marker with cross — one endpoint of the reflected bisector
- **Yang point**: Pie wedges with cross — the other endpoint
- **Link between**: Connects the yin and yang reflected points

This visualization reveals how the functional equation ζ(s) = ζ(1-s) manifests geometrically in the partial sum structure.

#### Remainder Legs (R/2 Forward and Inverse)

For the R/2 (half remainder) calculation:
- **Forward leg** (green): From origin to R/2 forward bisector point
- **Inverse leg** (red): From R/2 forward bisector to R/2 forward bisector + inverse bisector

These legs show how the remainder behaves geometrically, with multiple drawing options:
1. Off
2. Forward leg only
3. Both legs

Paths can also be shown tracing how these legs evolve through σ or index space.

#### Both Sums Legs (Forward, Inverse, and Inverse Reflected)

These visualizations show "both sum" analysis where forward and inverse spirals are compared:

**Forward Legs**:
- Green leg from origin to forward bisector
- Red leg from forward bisector to zeta
- Optional paths through σ (real) space
- Circle from forward bisector to zeta

**Inverse Legs**:
- Same structure but using inverse (chi-based) calculations
- Shows the "mirror image" from the functional equation perspective

**Inverse Reflected Legs**:
- The inverse legs reflected across the zeta value
- Reveals double symmetry in the functional equation

---

## Teardrop Pattern Visualizations

### YinYangRenderer — Teardrop Patterns Around the Bisector

The `YinYangRenderer` creates beautiful "teardrop" shapes that reveal how the yin and yang clock arms sweep through space as parameters vary.

#### Standard Yin-Yang Teardrops

For each fractional rotation around the bisector link, the yin and yang clock arms trace out teardrop-shaped regions:

- **Red teardrop**: Swept by the yin arm (before bisector)
- **Green teardrop**: Swept by the yang arm (after bisector)

These teardrops:
- Show the "envelope" of possible positions for the clock arms
- Reveal angular periodicities in the spiral structure
- Are scaled and rotated to match the bisector link orientation

**Mathematical significance**: The teardrops show how the partial sum structure oscillates. Where teardrops are narrow, the structure is more stable. Where they're wide, there's more variation.

#### Yin-Yang Link

A single magenta line connecting the yin and yang points at the current parameter value. This link:
- Shows the instantaneous "width" of the clock configuration
- Oscillates as t varies
- Has special values (maxima, minima, zero crossings) at mathematically significant points

#### Special Yin-Yang Teardrops

A variant teardrop calculation using a different method ("special" calculation):
- Different shape and size than standard teardrops
- Represents an alternative geometric interpretation
- Has its own link visualization

#### Inverse Reflected Yin-Yang

The standard yin-yang teardrops reflected across the zeta value:
- Red and green teardrops appear in mirrored positions
- Shows how the functional equation symmetry affects clock patterns
- Reveals the "shadow" of the teardrops on the other side of zeta

#### Infinity Teardrops

As parameters approach special values (like indices approaching 0.25 or 0.75), the teardrops extend toward infinity:

- **Cyan-colored** infinity teardrops
- Show limiting behavior of the clock configuration
- Undefined exactly at 0.25 and 0.75 (singularities in the teardrop formula)
- Reveal asymptotic structure of partial sums

#### Infinity Link

The link connecting the yin and yang infinity points:
- Cyan colored
- Shows the "width at infinity" of the clock configuration
- Has special mathematical properties at certain indices

#### Derivative Mode

Two calculation modes affect teardrop accuracy:
1. **Approximate** — Faster, uses finite differences
2. **Exact** — Slower but mathematically precise, uses analytical derivatives

---

### MiddleLinkTeardrop — Advanced Teardrop Visualizations

This component provides additional teardrop visualizations with higher detail:

#### G/R (Green/Red) Teardrops

High-resolution teardrops (250 points per teardrop) around the bisector link:
- **Green teardrop**: Yin (before bisector) swept area
- **Red teardrop**: Yang (after bisector) swept area
- Transparency control for adjustable visibility
- Exact derivative calculations for precision

**Inverse G/R Teardrops**:
- Same teardrops but reflected across zeta value
- Shows functional equation symmetry in teardrop structure

#### Yin-Yang Teardrops (Alternative Method)

Another implementation of yin-yang teardrops with:
- Different calculation approach
- Transparency control
- Both forward and reflected versions

#### INF (Infinity) Teardrops

High-detail infinity teardrop visualization:
- 200+ points for smooth curves
- Cyan colored
- Shows limiting behavior at special indices
- Separate transparency control for INF teardrops
- INF link toggle to show/hide the connecting link

---

## Remainder Function Visualizations

### SumRemainderRenderer — Three Types of Remainder Analysis

The `SumRemainderRenderer` visualizes three different remainder functions that measure what's "left over" after partial summation. Understanding these remainders is key to understanding zero locations.

#### R/2 (Half Remainder)

The R/2 remainder is half of the difference between forward and inverse sums:

**Components**:
- **Target points** (yellow): Where R/2 equals specific values
- **Forward leg** (first color): From origin to R/2 target
- **Inverse leg** (second color): From R/2 target to sum
- **Symmetry lines**: Cut, bisect, zeta/2, equal magnitude circles
- **Sigma path**: How R/2 evolves as σ varies (horizontal through critical strip)
- **Index path**: How R/2 evolves as index varies (vertical through critical strip)

Drawing options for legs:
1. Off
2. Forward leg only
3. Both legs
4. Forward with symmetry lines
5. Both with symmetry lines

#### Rps (Partial Sum Remainder)

The Rps remainder measures the difference between the partial sum and the true zeta value:

**Components** (cyan color scheme):
- Target points showing where Rps has special values
- Forward and inverse legs showing Rps geometric structure
- Symmetry analysis (cut lines, bisector, zeta/2, equal magnitude circles)
- Sigma path tracking Rps through the critical strip horizontally
- Index path tracking Rps vertically through t-values

**Mathematical significance**: Rps is directly related to convergence. Where Rps is small, the partial sum is close to the true value. Where Rps has zeros, special mathematical properties appear.

#### Rak (Asymptotic Kernel Remainder)

The Rak remainder is the most sophisticated remainder function, related to the asymptotic kernel in the Riemann-Siegel formula:

**Components** (green/red color scheme):
- Target points where Rak equals specific values
- Forward leg (green): First component of Rak geometry
- Inverse leg (red): Second component of Rak geometry
- Full symmetry analysis (all types of symmetry lines and circles)
- Sigma path showing Rak evolution across real values
- Index path showing Rak evolution across imaginary values

**Mathematical significance**: **Rak zeros are directly related to zeta zeros**. Where Rak and the partial sum have equal magnitude and opposite direction, zeta zeros appear. This is why Rak visualization is so powerful for understanding zero distribution.

#### Path Overlays

All three remainder types support path visualization:
- **Sigma paths**: Show how the remainder changes as you move horizontally through the critical strip (varying σ while t is fixed)
- **Index paths**: Show how the remainder changes as you move vertically (varying t while σ is fixed)
- **Inverse path overlay**: Adds the inverse path on top of forward paths

These paths reveal:
- Continuous deformation of remainder geometry
- Where remainders pass through zero (crossings)
- Periodic behavior in remainder structure
- Correlations between different remainder types

#### Rps-to-Rak Connection Lines

Special toggle that draws connection lines between Rps and Rak points, showing their geometric relationship and how they work together to approximate zeta.

---

## Critical Strip Exploration

### CriticalStripRenderer — Interactive 2D Map

The `CriticalStripRenderer` provides a bird's-eye view of the critical strip region 0 ≤ σ ≤ 1, allowing you to visualize thousands of mathematically significant points and navigate the complex plane interactively.

#### Coordinate System

**Horizontal axis**: Real part σ (typically 0 to 1, expandable to wider ranges)
**Vertical axis**: Dual mode —
- **Index Space**: Linear integer scale (1, 2, 3, ...) — easier to navigate, evenly spaced
- **Imaginary Space**: True t-values (14.13, 21.02, ...) — mathematically accurate, logarithmic spacing

The space toggle button switches between these modes, providing both convenience (index) and mathematical correctness (imaginary).

#### Visual Elements

**Critical Line**:
- Faint white vertical line at σ = 0.5
- Marks where the Riemann Hypothesis predicts all zeros lie
- Subtle but always visible as a reference

**Current Position Indicator**:
- Blinking marker (8 pixel size, 0.5 second blink rate)
- Fuchsia/white color
- Shows your current (σ, t) position
- Automatically updates as you change index or real sliders
- Fades out when position is outside visible range

**Point Cloud Datasets**:
- Each dataset loaded from CSV appears as colored points
- Point size varies by dataset (typically 4-8 pixels)
- Color-coded by mathematical significance
- Hover reveals point details
- Click to jump to that (σ, t) value

#### Interaction

**Click Anywhere**:
- Jumps the spiral visualization to the clicked (σ, t) coordinates
- Updates both index and real part automatically
- Provides immediate visual feedback
- Ignores clicks during/immediately after scrolling (100ms threshold)

**Zoom** (Mouse Wheel):
- Zooms in/out centered on mouse position
- Range: 0.5× (zoomed out) to 500× (zoomed in)
- In Index Space: Normal zoom sensitivity
- In Imaginary Space: 2× sensitivity (because imaginary values are logarithmically spaced)
- Preserves focus point — what's under your mouse stays under your mouse

**Pan** (Click and Drag):
- Drag to scroll the viewport
- In Index Space: Normal scroll sensitivity
- In Imaginary Space: 10× sensitivity (compensates for logarithmic spacing)
- Smooth continuous scrolling

**Center Button**:
- **Single Click**: Smoothly animates viewport to center on current position (0.5s animation)
- **Long Press** (>1 second): **Locks auto-centering** — viewport continuously follows as you change parameters (0.1s tight follow animation)
- Visual indicator shows when locked (locked state image appears)
- Click again to unlock

#### Hover Effects

When hovering over points:
- Point smoothly scales up 4× with rubber-band animation
- Overshoot to 10× then settle to 4× (0.4s total duration)
- Multiple points within hover threshold (1.2× pointSize) all animate
- Points return to normal size when no longer hovered
- Hover detection based on viewport coordinates (works at any zoom level)

#### Performance Features

**Frustum Culling**: Points outside the visible viewport aren't rendered
**Batching**: Points are grouped into efficient mesh batches (under Unity's 65k vertex limit)
**RectMask2D**: Clips points to viewport boundaries
**Lazy Updates**: Only recalculates positions when viewport changes

---

## Circle-Based Visualizations

### ZetaCircles — Circles Reveal Intersections

The `ZetaCircles` component draws circles based on geometric properties of the spiral, and their intersections reveal special mathematical values.

#### Zeta Circle (Green)

Centered at the "crotch point" (bisector of the bisector link):
- Radius = distance from crotch point to origin
- Shows the natural "orbit" of the partial sum's geometric center
- Green color (with adjustable transparency)

**Crotch point**: The bisecting point of the middle link of the spiral — the geometric center around which the spiral's "clock" rotates.

#### Midpoint Circle (Red)

Centered at the spiral's middle point:
- Radius = distance from middle point to origin
- Middle point is the cumulative sum up to the middle index
- Red color (with adjustable transparency)

#### Bisect Circle (Cyan)

Centered at zeta/2 (half the zeta value):
- Radius = distance from zeta/2 to origin
- Shows the "halfway point" toward the final zeta value
- Cyan color (with adjustable transparency)

#### Circle Intersections

The tool can visualize where circles intersect:
- Draws intersection points explicitly
- Highlights the intersection with largest magnitude

**Mathematical significance**: Circle intersections occur at specific t-values related to:
- Zeros of certain auxiliary functions
- Gram-like points
- Special symmetry configurations

#### Intersection Trail

Records intersection points as t varies:
- Magenta colored path
- Adjustable trail length (number of points remembered)
- Shows how intersection points move through the complex plane
- Reveals periodic patterns and resonances

#### Automatic Zero Finding

Toggle to automatically search for "intersection zeros" — values where the two intersection points coincide (distance = 0):
- Steps through t-values automatically
- Records zeros found
- Saves to `intersection-zeros.csv` on app quit
- Useful for discovering new special values

---

### SpiralLinkCircles — Circles Based on Individual Links

Similar to ZetaCircles but based on individual spiral links rather than overall properties. Draws circles for each link segment, revealing fine structure in the spiral geometry.

---

## Special Point Visualizations

### Point Set System — Overlaying Mathematical Points

Zest can load and visualize multiple CSV datasets of mathematically significant points simultaneously. Each dataset represents a different mathematical phenomenon.

#### Available Point Sets

**Fundamental Zeros and Critical Values**:
1. **00 Zeta Zeros** — First 100,000 zeros of ζ(1/2 + it)
2. **01 Gram Points** — Points where arg(ζ(1/2 + it)) = 0 (θ(t) = nπ)

**Rak Function Analysis**:
3. **02 Rak1 Zeros [σ5]** — Zeros of Rak1 remainder at σ = 0.5
4. **02 Rak1 Zetas [σ5]** — Where Rak1 equals the zeta value
5. **03 Rak1 Zeros σ-4** — Rak1 zeros at different σ values
6. **Rak1 variants** — Multiple datasets exploring Rak behavior

**ZPS (Zeta Partial Sum) Special Points**:
7. **04 Zak Leg Angle = PI** — Where clock arms are perfectly opposed (angle = π)
8. **05 Zak Leg Angle = Zero** — Where clock arms align (angle = 0)
9. **10-13 ZPS Equal Legs** — Multiple series showing where yin/yang arms have equal length
   - For indices 1, 2, 3, 4, 5, 10, 15, 20
   - At index fractions 0.25 and 0.75 (special fractional indices)

**Theta Function Critical Points**:
10. **50-57 Theta Series** — Theta function values and extrema at various σ
    - θ₁(t) at σ = 0.5
    - θ₂(t) at σ = 0, 0.125, 0.25, 0.375, 0.5, 1
    - Local minima and maxima
    - First occurrences of specific values

**User Points**:
11. **Favorite Points** — User-saved locations of interest

#### CSV Format

Point sets use an enhanced CSV format with metadata:
```
#@name: Dataset Name
#@color: 255,128,0,255 (RGBA)
#@skipCriticalLine: false
#@samplingInterval: 1
#@pointSize: 4
0.5, 14.134725  # First point (sigma, t)
0.5, 21.022040  # Second point
...
```

The `#@` prefix marks metadata, `#` marks comments.

#### Interactive Features

- **Toggle visibility** for each dataset independently
- **Color-coded** by mathematical type
- **Hover** to see point details
- **Click** any point to jump the spiral there
- **Statistics** display (number of points, range, etc.)
- **Save favorites** for quick access

---

### RhombusPoints — Rhombus Intersection Calculator

Provides utility functions to calculate rhombus intersections:

**GetBPForward**: Forward bisector point
**GetBPInverse**: Inverse bisector point
**GetBPReflectedInverse**: Reflected inverse bisector intersection
**GetBPSymmetry**: Symmetry crotch point

When forward and inverse bisector points are perfectly opposite (BP_forward = -BP_inverse), the configuration forms a rhombus, which correlates with zeta zeros.

---

### ClockPoints — Clock Arm Family Lines

Visualizes families of clock arm configurations:
- Creates tables of clock points for multiple n-families (n=0, 1, 2, ...)
- Draws connecting lines between related clock configurations
- Color-codes: Red for one family, green for another, cyan for infinity families
- Shows periodic patterns in clock arm geometry
- Can write tables to CSV for further analysis

**Families**:
- Even families (n=0, 2, 4, ...) — red
- Odd families (n=1, 3, 5, ...) — green
- Infinity families (n approaching limits) — cyan

Adjustable parameters:
- Number of points per family
- Family range (start to end)
- Line transparency

---

### WindowPoints — Pre-computed Special Values

A hardcoded list of special window points — t-values where interesting mathematical phenomena occur. These are pre-computed values discovered through analysis.

The slider allows you to jump directly to any of these pre-computed special values for investigation.

---

### SpiralGramPoints — Navigate to Gram Points

Provides a slider interface to jump directly to any Gram point:
- Loads from GramPoints data structure
- Input slider with min/max range controls
- Text display of current Gram point index
- Instantly updates the main visualization to that t-value

**Gram points** are historically significant because they were used to count zeros before modern computers. Understanding Gram points helps understand zero distribution.

---

## Understanding the Mathematical Concepts

### What is the Bisector?

The **bisector** or **bisector link** is the "middle link" of the partial sum spiral. If you sum N terms, the bisector is roughly at index N/2. More precisely:

- **Middle index**: floor(index) + 1 for fractional indices
- **Bisector point**: The joint at the middle index
- **Bisector link**: The link connecting middle index to middle index + 1

The bisector is important because:
1. It's the geometric "balance point" of the partial sum
2. The "clock" configuration (yin/yang arms) is centered on it
3. Many special properties emerge when the bisector has specific geometric relationships to the origin and zeta

### What are Yin and Yang?

**Yin** and **Yang** refer to the two clock arms on either side of the bisector:

- **Yin arms**: Two links BEFORE the bisector (from middle_index - 1 to middle_index)
- **Yang arms**: Two links AFTER the bisector (from middle_index + 1 to middle_index + 2)

Together, these four links form the **"clock"** configuration:
```
...--[yin]--[yin]--[BISECTOR]--[yang]--[yang]--...
```

The yin/yang terminology comes from their complementary nature:
- They have similar magnitudes but different angles
- They "balance" each other around the bisector
- Their relative angles and lengths reveal symmetry properties
- They're colored green (yin) and red (yang) in visualizations

### What are Teardrops?

**Teardrops** are the envelope curves traced out by rotating clock arms. As parameters vary:
- The yin arm sweeps through space, tracing a teardrop-shaped region
- The yang arm does the same, creating its own teardrop
- The teardrops reveal the "range of motion" of the clock configuration

Teardrops are important because:
1. They show stability regions (narrow teardrops = stable, wide = unstable)
2. They reveal periodic structure in partial sums
3. They connect to derivatives and rates of change
4. Their special configurations (intersections, tangencies) correspond to mathematically significant t-values

### What is the Symmetry Point?

The **symmetry point** is the point that makes a triangle with the origin and zeta value, where the bisector of the triangle passes through a special geometric center.

It represents:
- The reflection point for symmetry operations
- The balance point for "both sums" analysis (forward + inverse)
- A key point in understanding the functional equation geometrically

### What are Remainder Functions?

**Remainder functions** measure what's "left over" after partial summation:

**R/2** (Half Remainder):
- The simplest remainder: (Forward sum - Inverse sum) / 2
- Shows the asymmetry between forward and inverse calculations

**Rps** (Partial Sum Remainder):
- Difference between partial sum and true zeta value
- Directly measures convergence
- Related to truncation error

**Rak** (Asymptotic Kernel Remainder):
- From the Riemann-Siegel formula
- Most sophisticated remainder
- **Its zeros are closely related to zeta zeros**
- Understanding Rak is key to understanding zero distribution

### Why Do These Visualizations Matter?

These visualizations transform abstract complex analysis into geometric intuition:

1. **Zeros**: Where remainders equal partial sums, where circles intersect, where symmetries align
2. **Convergence**: Visualized through spiral tightness, remainder magnitude, teardrop width
3. **Functional Equation**: Seen as reflection, inversion, and "both sums" symmetry
4. **Critical Line**: The σ = 0.5 line where visualizations are simplest and cleanest
5. **Gram Points**: Visible as correlations in point cloud data
6. **Periodic Structure**: Revealed in teardrops, paths, and oscillating patterns

By seeing these concepts geometrically, you can:
- Develop intuition for why zeros appear where they do
- Understand relationships between different zeta properties
- Discover new patterns by visual exploration
- Verify theoretical predictions through observation
- Teach complex analysis concepts accessibly

---

## Workflow Recommendations

### For Exploring Zeros

1. Load "Zeta Zeros" point set in Critical Strip view
2. Click on a zero to jump there
3. Enable EMS or ZRS spiral
4. Toggle "Bisector Link" drawing mode
5. Add Rak forward and inverse legs
6. Observe how Rak and partial sum are opposite near zeros

### For Understanding Symmetry

1. Start with EMS forward spiral (all links)
2. Add "Reverse Spiral" to see reflection
3. Add "Inverse Spiral" to see functional equation
4. Toggle "Symmetry Point" to see the triangle
5. Watch "Symmetry Real Path" as you vary σ
6. Observe how symmetry changes across the critical strip

### For Studying Clock Patterns

1. Set drawing mode to "Clock"
2. Enable "Bisector" and "Clock Arms" highlighting
3. Add Yin-Yang teardrops
4. Enable Yin-Yang link
5. Vary index slowly and watch how teardrops oscillate
6. Look for narrow teardrops (stable regions) and wide teardrops (unstable)

### For Remainder Analysis

1. Start with one remainder type (R/2, Rps, or Rak)
2. Enable target points
3. Add forward and inverse legs
4. Enable symmetry lines
5. Add sigma path to see horizontal evolution
6. Add index path to see vertical evolution
7. Compare with zeta zeros on Critical Strip view

---

## Technical Notes

- All calculations use double precision (64-bit float) for maximum accuracy
- Immediate mode rendering via Shapes library for responsive graphics
- Event-driven architecture: calculations trigger rendering updates
- Caching system prevents unnecessary recalculation
- Transparency and color controls for all major visualization elements
- Over 100 independent toggles for fine-grained control
- Real-time: all calculations performed on-demand, no pre-computation required

---

*This guide documents the visualization system as of the current build. The mathematical insights discovered through these visualizations continue to evolve.*
