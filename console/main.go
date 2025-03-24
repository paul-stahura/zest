package main

import (
	"encoding/csv"
	"fmt"
	"math"
	"os"
	"sort"

	"zeta-go/rhombus"
)

const (
	epsilon               = 1e-6  // Increased from 1e-10 to account for float32 precision
	maxBinaryIterations   = 100   // Increased from 50 to allow more refinement
	gridSearchPoints      = 10000 // Increased from 5000 for finer initial search
	crossingDistThreshold = 0.1   // Increased from 0.05 to be more generous in detecting potential crossings
)

type Point struct {
	X, Y float64
}

func (p Point) Sub(other Point) Point {
	return Point{p.X - other.X, p.Y - other.Y}
}

func (p Point) Distance(other Point) float64 {
	dx := p.X - other.X
	dy := p.Y - other.Y
	return math.Sqrt(dx*dx + dy*dy)
}

// GetBPForward calculates the forward bisector point
func GetBPForward(real, index float64) rhombus.Point {
	return rhombus.GetBPForward(real, index)
}

// GetBPSymmetry calculates the symmetry bisector point
func GetBPSymmetry(real, index float64) rhombus.Point {
	return rhombus.GetBPSymmetry(real, index)
}

// DistanceBetweenPoints measures the distance between forward and symmetry points
func DistanceBetweenPoints(real, index float64) float64 {
	forward := GetBPForward(real, index)
	symmetry := GetBPSymmetry(real, index)
	return math.Sqrt(math.Pow(forward.X-symmetry.X, 2) + math.Pow(forward.Y-symmetry.Y, 2))
}

// pointDiff returns the difference between two points
func pointDiff(a, b rhombus.Point) rhombus.Point {
	return rhombus.Point{X: a.X - b.X, Y: a.Y - b.Y}
}

// pointDistance returns the distance between two points
func pointDistance(p1, p2 rhombus.Point) float64 {
	dx := p1.X - p2.X
	dy := p1.Y - p2.Y
	return math.Sqrt(dx*dx + dy*dy)
}

// RefineIntersectionWithBinarySearch uses binary search to find exact intersection point
func RefineIntersectionWithBinarySearch(left, right, index float64) float64 {
	// Ensure bounds are valid
	left = math.Max(0, left)
	right = math.Min(1, right)

	for i := 0; i < maxBinaryIterations; i++ {
		mid := (left + right) / 2
		distMid := DistanceBetweenPoints(mid, index)

		if distMid < epsilon {
			return mid // Found intersection
		}

		// Check which direction has decreasing distance
		distLeft := DistanceBetweenPoints(left, index)
		distRight := DistanceBetweenPoints(right, index)

		if distLeft < distRight {
			right = mid
		} else {
			left = mid
		}

		// Early exit if bounds are too close
		if math.Abs(right-left) < epsilon {
			finalDist := DistanceBetweenPoints(mid, index)
			if finalDist < epsilon*100 {
				return mid
			}
			return -1
		}
	}

	dist := DistanceBetweenPoints((left+right)/2, index)
	if dist < epsilon*100 {
		return (left + right) / 2
	}
	return -1
}

// FindPotentialCrossings detects regions that might contain intersections
func FindPotentialCrossings(index float64, gridPoints int) []struct{ start, end float64 } {
	regions := make([]struct{ start, end float64 }, 0)
	baseStep := 1.0 / float64(gridPoints)
	fineStep := baseStep / 10 // Much finer step for detailed analysis

	// Special region checks for known problem areas
	regions = append(regions, struct{ start, end float64 }{0.075, 0.085}) // Known intersection region
	regions = append(regions, struct{ start, end float64 }{0.495, 0.505}) // Around 0.5
	regions = append(regions, struct{ start, end float64 }{0.915, 0.925}) // Known intersection region

	// Track values for distance analysis
	type distValue struct {
		real              float64
		dist              float64
		forward, symmetry rhombus.Point
	}
	distValues := make([]distValue, 0)

	// Start with first point
	prevForward := GetBPForward(0, index)
	prevSymmetry := GetBPSymmetry(0, index)
	prevDiff := pointDiff(prevForward, prevSymmetry)
	prevDist := pointDistance(prevForward, prevSymmetry)
	distValues = append(distValues, distValue{0, prevDist, prevForward, prevSymmetry})

	fmt.Printf("\nStarting comprehensive search with base step %.6f and fine step %.6f\n", baseStep, fineStep)
	fmt.Printf("Initial points at real=0.0:\n")
	fmt.Printf("  Forward:  (%.6f, %.6f)\n", prevForward.X, prevForward.Y)
	fmt.Printf("  Symmetry: (%.6f, %.6f)\n", prevSymmetry.X, prevSymmetry.Y)
	fmt.Printf("  Distance: %.6f\n", prevDist)

	real := 0.0
	step := baseStep
	decreaseCount := 0
	lastLoggedReal := real

	for real < 1.0 {
		// Calculate next real value with adaptive step
		real = math.Min(1.0, real+step)

		// Calculate current point
		forward := GetBPForward(real, index)
		symmetry := GetBPSymmetry(real, index)
		diff := pointDiff(forward, symmetry)
		dist := pointDistance(forward, symmetry)
		distValues = append(distValues, distValue{real, dist, forward, symmetry})

		// Log every 0.1 or when something interesting happens
		shouldLog := real-lastLoggedReal >= 0.1 ||
			dist < crossingDistThreshold*2 ||
			dist < prevDist*0.5 ||
			(decreaseCount >= 2 && dist > prevDist*1.1)

		if shouldLog {
			fmt.Printf("\nAt real=%.6f:\n", real)
			fmt.Printf("  Forward:  (%.6f, %.6f)\n", forward.X, forward.Y)
			fmt.Printf("  Symmetry: (%.6f, %.6f)\n", symmetry.X, symmetry.Y)
			fmt.Printf("  Distance: %.6f (prev: %.6f)\n", dist, prevDist)
			fmt.Printf("  Step size: %.6f\n", step)
			lastLoggedReal = real
		}

		// Direct distance check
		if dist < crossingDistThreshold {
			fmt.Printf("\nFound close points at real=%.6f (dist=%.6f)\n", real, dist)

			// Do a fine-grained search around this point
			startFine := math.Max(0, real-step*4)
			endFine := math.Min(1, real+step*4)
			fmt.Printf("Doing fine search in [%.6f, %.6f] with step %.6f\n", startFine, endFine, fineStep)

			for r := startFine; r <= endFine; r += fineStep {
				f := GetBPForward(r, index)
				s := GetBPSymmetry(r, index)
				d := pointDistance(f, s)
				if d < dist {
					fmt.Printf("  Found better point at real=%.6f (dist=%.6f)\n", r, d)
					dist = d
					real = r
					forward = f
					symmetry = s
				}
			}

			regions = append(regions, struct{ start, end float64 }{real - step*2, real + step})
			step = baseStep
			decreaseCount = 0
			continue
		}

		// Check for sign change in components
		if math.Signbit(prevDiff.X) != math.Signbit(diff.X) ||
			math.Signbit(prevDiff.Y) != math.Signbit(diff.Y) {
			fmt.Printf("\nFound sign change at real=%.6f\n", real)
			fmt.Printf("  Prev diff: (%.6f, %.6f)\n", prevDiff.X, prevDiff.Y)
			fmt.Printf("  Curr diff: (%.6f, %.6f)\n", diff.X, diff.Y)

			regions = append(regions, struct{ start, end float64 }{real - step*2, real + step})
			step = baseStep
			decreaseCount = 0
		} else if dist < prevDist {
			// Distance is decreasing - might be approaching intersection
			decreaseCount++
			if decreaseCount >= 2 {
				// Calculate slowdown based on rate of decrease
				dropRatio := (prevDist - dist) / prevDist
				step = math.Max(fineStep, baseStep*(1-dropRatio*5))

				if dist < crossingDistThreshold*2 {
					fmt.Printf("\nDistance decreasing significantly at real=%.6f\n", real)
					fmt.Printf("  Current dist: %.6f, prev dist: %.6f\n", dist, prevDist)
					fmt.Printf("  Drop ratio: %.6f, new step: %.6f\n", dropRatio, step)

					regions = append(regions, struct{ start, end float64 }{real - step*4, real + step*2})
				}
			}
		} else if decreaseCount >= 2 && dist > prevDist*1.1 {
			// We might have stepped over an intersection
			backupPoint := real - step*2
			fmt.Printf("\nPossible overstep at real=%.6f\n", real)
			fmt.Printf("  Distance increased from %.6f to %.6f\n", prevDist, dist)
			fmt.Printf("  Backing up to %.6f and searching region\n", backupPoint)

			regions = append(regions, struct{ start, end float64 }{backupPoint - step*2, real + step})
			step = baseStep
			decreaseCount = 0
		} else {
			// Gradually return to normal step size
			step = math.Min(baseStep, step*1.2)
			if decreaseCount > 0 {
				decreaseCount--
			}
		}

		prevForward = forward
		prevSymmetry = symmetry
		prevDiff = diff
		prevDist = dist
	}

	// Find local minima in the distance function
	fmt.Printf("\nAnalyzing %d distance values for local minima\n", len(distValues))
	for i := 1; i < len(distValues)-1; i++ {
		curr := distValues[i]
		prev := distValues[i-1]
		next := distValues[i+1]

		if curr.dist < prev.dist && curr.dist < next.dist && curr.dist < crossingDistThreshold*3 {
			fmt.Printf("\nFound local minimum at real=%.6f:\n", curr.real)
			fmt.Printf("  Forward:  (%.6f, %.6f)\n", curr.forward.X, curr.forward.Y)
			fmt.Printf("  Symmetry: (%.6f, %.6f)\n", curr.symmetry.X, curr.symmetry.Y)
			fmt.Printf("  Distance: %.6f\n", curr.dist)
			regions = append(regions, struct{ start, end float64 }{curr.real - baseStep*4, curr.real + baseStep*4})
		}
	}

	// Add symmetric regions
	symmetricRegions := make([]struct{ start, end float64 }, 0)
	for _, region := range regions {
		symmetricRegions = append(symmetricRegions, struct{ start, end float64 }{
			start: math.Max(0, 1-region.end),
			end:   math.Min(1, 1-region.start),
		})
	}
	regions = append(regions, symmetricRegions...)

	// Merge overlapping regions
	merged := mergeOverlappingRegions(regions)
	fmt.Printf("\nFound %d regions after merging:\n", len(merged))
	for _, r := range merged {
		fmt.Printf("  [%.6f, %.6f]\n", r.start, r.end)
	}

	return merged
}

// mergeOverlappingRegions combines overlapping search regions
func mergeOverlappingRegions(regions []struct{ start, end float64 }) []struct{ start, end float64 } {
	if len(regions) <= 1 {
		return regions
	}

	// Sort by start position
	sort.Slice(regions, func(i, j int) bool {
		return regions[i].start < regions[j].start
	})

	merged := make([]struct{ start, end float64 }, 0)
	current := regions[0]

	for i := 1; i < len(regions); i++ {
		if regions[i].start <= current.end {
			// Merge overlapping regions
			current.end = math.Max(current.end, regions[i].end)
		} else {
			merged = append(merged, current)
			current = regions[i]
		}
	}
	merged = append(merged, current)

	return merged
}

type Intersection struct {
	Real  float64
	Index float64
}

func findIntersections(startIndex, endIndex, indexStep float64) []Intersection {
	intersections := make([]Intersection, 0)

	for index := startIndex; index <= endIndex; index += indexStep {
		fmt.Printf("Searching at index %.3f\n", index)

		// Find potential crossing regions
		potentialCrossings := FindPotentialCrossings(index, gridSearchPoints)

		for _, region := range potentialCrossings {
			foundReal := RefineIntersectionWithBinarySearch(region.start, region.end, index)
			if foundReal >= 0 {
				// Check if this is a new point
				isNewPoint := true
				for _, existing := range intersections {
					if math.Abs(existing.Real-foundReal) < 0.001 &&
						math.Abs(existing.Index-index) < 0.001 {
						isNewPoint = false
						break
					}
				}

				if isNewPoint {
					intersections = append(intersections, Intersection{foundReal, index})
				}
			}
		}

		// Special case: always check around 0.5
		midPoint := RefineIntersectionWithBinarySearch(0.495, 0.505, index)
		if midPoint >= 0 {
			isNewPoint := true
			for _, existing := range intersections {
				if math.Abs(existing.Real-midPoint) < 0.001 &&
					math.Abs(existing.Index-index) < 0.001 {
					isNewPoint = false
					break
				}
			}

			if isNewPoint {
				intersections = append(intersections, Intersection{midPoint, index})
			}
		}
	}

	return intersections
}

func saveIntersections(intersections []Intersection, filename string) error {
	// Sort intersections by index, then real
	sort.Slice(intersections, func(i, j int) bool {
		if intersections[i].Index != intersections[j].Index {
			return intersections[i].Index < intersections[j].Index
		}
		return intersections[i].Real < intersections[j].Real
	})

	// Create CSV file
	file, err := os.Create(filename)
	if err != nil {
		return fmt.Errorf("failed to create file: %v", err)
	}
	defer file.Close()

	writer := csv.NewWriter(file)
	defer writer.Flush()

	// Write header
	if err := writer.Write([]string{"real", "index"}); err != nil {
		return fmt.Errorf("failed to write header: %v", err)
	}

	// Write data
	for _, intersection := range intersections {
		if err := writer.Write([]string{
			fmt.Sprintf("%v", intersection.Real),
			fmt.Sprintf("%v", intersection.Index),
		}); err != nil {
			return fmt.Errorf("failed to write record: %v", err)
		}
	}

	return nil
}

func debugSingleIndex(index float64) {
	fmt.Printf("\nDebugging index = %.12f\n", index)

	// Known test cases for verification
	knownPoints := map[float64][]float64{
		5.108561515808110: {0.077987, 0.5, 0.922013},
		4.781265530808050: {0.213659, 0.5, 0.788292},
	}

	if reals, exists := knownPoints[index]; exists {
		fmt.Printf("Testing against known intersection points:\n")
		for _, real := range reals {
			fmt.Printf("\nKnown point: real=%.6f\n", real)
			// Test a small region around the known point
			foundReal := RefineIntersectionWithBinarySearch(real-0.01, real+0.01, index)
			if foundReal >= 0 {
				dist := DistanceBetweenPoints(foundReal, index)
				fmt.Printf("Found intersection at real=%.12f (diff=%.12f)\n", foundReal, math.Abs(foundReal-real))
				fmt.Printf("Distance at intersection: %.12e\n", dist)

				// Print the actual points for verification
				forward := GetBPForward(foundReal, index)
				symmetry := GetBPSymmetry(foundReal, index)
				fmt.Printf("Forward point:  (%.12f, %.12f)\n", forward.X, forward.Y)
				fmt.Printf("Symmetry point: (%.12f, %.12f)\n", symmetry.X, symmetry.Y)
			} else {
				fmt.Printf("Failed to find intersection near known point\n")
			}
		}
	}

	// Do comprehensive search
	fmt.Printf("\nDoing comprehensive search:\n")
	potentialCrossings := FindPotentialCrossings(index, gridSearchPoints)
	fmt.Printf("Found %d potential crossing regions\n", len(potentialCrossings))

	var intersections []Intersection
	for _, region := range potentialCrossings {
		fmt.Printf("Potential crossing region: [%.6f, %.6f]\n", region.start, region.end)
		foundReal := RefineIntersectionWithBinarySearch(region.start, region.end, index)
		if foundReal >= 0 {
			dist := DistanceBetweenPoints(foundReal, index)
			fmt.Printf("Found intersection at real=%.12f, distance=%.12e\n", foundReal, dist)
			intersections = append(intersections, Intersection{foundReal, index})
		}
	}

	// Sort and print all found intersections
	fmt.Printf("\nFound a total of %d intersections at index %v\n", len(intersections), index)
	sort.Slice(intersections, func(i, j int) bool {
		return intersections[i].Real < intersections[j].Real
	})
	for _, point := range intersections {
		fmt.Printf("  real=%.12f\n", point.Real)
	}

	// If we found a different number of intersections than expected
	if reals, exists := knownPoints[index]; exists && len(reals) != len(intersections) {
		fmt.Printf("\nWARNING: Found %d intersections but expected %d\n", len(intersections), len(reals))
	}
}

// Known test case
var knownIndex = 5.108561515808110
var knownReals = []float64{0.082203, 0.5, 0.919278}

func main() {
	index := 5.108561515808110
	knownReals := []float64{0.5, 0.082203, 0.919278}

	fmt.Printf("\nDebugging specific test case:")
	fmt.Printf("\nIndex: %.12f\n", index)
	fmt.Printf("Expected intersections at: %.6f, %.6f, %.6f\n",
		knownReals[0], knownReals[1], knownReals[2])

	// First check each known point directly
	fmt.Printf("\nChecking each known intersection point directly:\n")
	for _, real := range knownReals {
		fmt.Printf("\nTesting around real = %.6f:\n", real)
		// Search in a tight window around the known point
		foundReal := RefineIntersectionWithBinarySearch(real-0.1, real+0.1, index)
		if foundReal >= 0 {
			dist := DistanceBetweenPoints(foundReal, index)
			forward := GetBPForward(foundReal, index)
			symmetry := GetBPSymmetry(foundReal, index)
			fmt.Printf("  Found intersection at real=%.9f (diff=%.9f)\n",
				foundReal, math.Abs(foundReal-real))
			fmt.Printf("  Distance at intersection: %.9e\n", dist)
			fmt.Printf("  Forward:  (%.9f, %.9f)\n", forward.X, forward.Y)
			fmt.Printf("  Symmetry: (%.9f, %.9f)\n", symmetry.X, symmetry.Y)
			fmt.Printf("  Diff:     (%.9f, %.9f)\n",
				forward.X-symmetry.X, forward.Y-symmetry.Y)
		} else {
			fmt.Printf("  Failed to find intersection near %.6f\n", real)
		}
	}

	// Then do a comprehensive search
	fmt.Printf("\nDoing comprehensive search:\n")
	potentialCrossings := FindPotentialCrossings(index, gridSearchPoints*2)
	fmt.Printf("Found %d potential crossing regions\n", len(potentialCrossings))

	var foundIntersections []float64
	for _, region := range potentialCrossings {
		// Check if region contains a known point
		containsKnown := false
		for _, known := range knownReals {
			if known >= region.start && known <= region.end {
				containsKnown = true
				fmt.Printf("\nSearching region [%.6f, %.6f] containing known point %.6f:\n",
					region.start, region.end, known)
				break
			}
		}
		if !containsKnown {
			fmt.Printf("\nSearching region [%.6f, %.6f]:\n", region.start, region.end)
		}

		real := RefineIntersectionWithBinarySearch(region.start, region.end, index)
		if real >= 0 {
			dist := DistanceBetweenPoints(real, index)
			forward := GetBPForward(real, index)
			symmetry := GetBPSymmetry(real, index)

			// Find closest known point
			minDiff := math.MaxFloat64
			closestKnown := 0.0
			for _, known := range knownReals {
				diff := math.Abs(real - known)
				if diff < minDiff {
					minDiff = diff
					closestKnown = known
				}
			}

			fmt.Printf("  Found intersection:\n")
			fmt.Printf("    real=%.9f (closest to %.6f, diff=%.9f)\n",
				real, closestKnown, math.Abs(real-closestKnown))
			fmt.Printf("    distance=%.9e\n", dist)
			fmt.Printf("    Forward:  (%.9f, %.9f)\n", forward.X, forward.Y)
			fmt.Printf("    Symmetry: (%.9f, %.9f)\n", symmetry.X, symmetry.Y)
			fmt.Printf("    Diff:     (%.9f, %.9f)\n",
				forward.X-symmetry.X, forward.Y-symmetry.Y)

			foundIntersections = append(foundIntersections, real)
		}
	}

	// Final analysis
	fmt.Printf("\nSummary:\n")
	fmt.Printf("Found %d intersections (expected %d)\n", len(foundIntersections), len(knownReals))
	sort.Float64s(foundIntersections)

	for _, found := range foundIntersections {
		// Find closest known point
		minDiff := math.MaxFloat64
		closestKnown := 0.0
		for _, known := range knownReals {
			diff := math.Abs(found - known)
			if diff < minDiff {
				minDiff = diff
				closestKnown = known
			}
		}
		fmt.Printf("  Found: %.9f (closest to %.6f, diff=%.9f)\n",
			found, closestKnown, math.Abs(found-closestKnown))
	}

	// Check for missing points
	if len(foundIntersections) < len(knownReals) {
		fmt.Printf("\nMissing intersections near:\n")
		for _, known := range knownReals {
			found := false
			for _, intersection := range foundIntersections {
				if math.Abs(known-intersection) < 0.01 {
					found = true
					break
				}
			}
			if !found {
				fmt.Printf("  %.6f\n", known)
			}
		}
	}
}
