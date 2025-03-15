package main

import (
	"flag"
	"fmt"
	"image/color"
	"image/draw"
	"image/png"
	"io/ioutil"
	"log"
	"math"
	"math/cmplx"
	"os"
	"runtime"
	"sync"
	"time"

	"image"

	"zeta-scale-go/pkg/compression"

	"github.com/golang/freetype/truetype"
	"github.com/llgcode/draw2d"
	"github.com/llgcode/draw2d/draw2dimg"
)

// Constants for the Euler-Maclaurin summation
var (
	MinN      = 100
	MaxN      = 65_000_000_000
	ChunkSize = calculateDefaultChunkSize()
)

// calculateDefaultChunkSize determines the chunk size based on CPU cores
// using 1024 chunks as baseline for 20 threads (10 cores)
func calculateDefaultChunkSize() int {
	numThreads := runtime.NumCPU()
	// Scale chunks proportionally: (1024 chunks / 20 threads) * actual threads
	targetChunks := (1024 * numThreads) / 20

	// Ensure we don't go below 256 or above 4096 chunks
	if targetChunks < 256 {
		targetChunks = 256
	} else if targetChunks > 4096 {
		targetChunks = 4096
	}

	// Calculate chunk size based on MaxN and desired chunks
	chunkSize := (MaxN + targetChunks - 1) / targetChunks

	log.Printf("System has %d CPU threads, using %d chunks (chunk size: %d)",
		numThreads, targetChunks, chunkSize)

	return chunkSize
}

func init() {
	// Load the font file from macOS fonts folder.
	fontBytes, err := ioutil.ReadFile("/Library/Fonts/Arial Unicode.ttf")
	if err != nil {
		log.Fatalf("failed to read font file: %v", err)
	}

	// Parse the font using the freetype/truetype package.
	parsedFont, err := truetype.Parse(fontBytes)
	if err != nil {
		log.Fatalf("failed to parse font: %v", err)
	}

	// Register the font so that draw2d can use it.
	draw2d.RegisterFont(draw2d.FontData{
		Name:   "Arial",
		Family: draw2d.FontFamilySans,
		Style:  draw2d.FontStyleNormal,
	}, parsedFont)
}

// computePartialSumWithLinks computes the sum from [start, end) and returns
//  1. The final partial sum for that chunk
//  2. All intermediate partial sums in that range (the "links" for that chunk)
func computePartialSumWithLinks(start, end int, s complex128) (complex128, []complex128) {
	partialSum := complex(0, 0)
	var linkList []complex128

	for k := start; k < end; k++ {
		term := cmplx.Pow(complex(float64(k), 0), -s)
		partialSum += term
		linkList = append(linkList, partialSum)
	}
	return partialSum, linkList
}

// calculateSpiralPartialSums performs the multi-threaded computation and
// returns the total sum and the properly chained links.
func calculateSpiralPartialSums(s complex128) (complex128, []complex128) {
	// Determine how many terms N
	N := int(cmplx.Abs(s))
	println("N", N)
	if N < MinN {
		N = MinN
	} else if N > MaxN {
		N = MaxN
	}
	println("N", N)

	// numWorkers := runtime.NumCPU()
	// // Figure out how many chunks we need
	// numChunks := (N + numWorkers - 1) / numWorkers
	numChunks := 1024 // (N + ChunkSize - 1) / ChunkSize

	// Prepare slices to hold each chunk's result
	partialSums := make([]complex128, numChunks)
	allChunkLinks := make([][]complex128, numChunks)

	var wg sync.WaitGroup
	wg.Add(numChunks)

	// Launch goroutines to compute partial sums
	for i := 0; i < numChunks; i++ {
		start := i*ChunkSize + 1
		end := start + ChunkSize
		if end > N {
			end = N
		}

		go func(idx, st, ed int) {
			defer wg.Done()
			sumVal, linkVals := computePartialSumWithLinks(st, ed, s)
			partialSums[idx] = sumVal
			allChunkLinks[idx] = linkVals
		}(i, start, end)
	}

	// Wait for goroutines to finish
	wg.Wait()

	// Now chain the results in the correct order
	var totalSum complex128
	var chainedLinks []complex128
	runningSum := complex(0, 0)

	for i := 0; i < numChunks; i++ {
		// Adjust this chunk's links by the runningSum so that they are continuous
		for j := range allChunkLinks[i] {
			allChunkLinks[i][j] += runningSum
		}
		// Update the running sum by the chunk's final partial sum
		runningSum += partialSums[i]
		// Append the newly adjusted chunk links to the big list
		chainedLinks = append(chainedLinks, allChunkLinks[i]...)
	}

	// runningSum is effectively the total sum of the first N terms
	totalSum = runningSum

	// Apply Euler-Maclaurin correction terms
	term1 := cmplx.Pow(complex(float64(N), 0), 1-s) / (s - 1)
	term2 := 0.5 * cmplx.Pow(complex(float64(N), 0), -s)
	totalSum += term1 + term2

	// Also add corrections to the final link
	if len(chainedLinks) > 0 {
		chainedLinks[len(chainedLinks)-1] += term1 + term2
	}

	return totalSum, chainedLinks
}

// calculateSingleThreadedPartialSums simply accumulates the sum link by link
func calculateSingleThreadedPartialSums(s complex128, numLinks int) []complex128 {
	links := make([]complex128, numLinks)
	partialSum := complex(0, 0)

	for k := 1; k < numLinks; k++ {
		term := cmplx.Pow(complex(float64(k), 0), -s)
		partialSum += term
		links[k] = partialSum
		log.Printf("Single-threaded link %d: (%.6f, %.6f)", k, real(partialSum), imag(partialSum))
	}
	return links
}

// plotLinks creates and saves a PNG of the link path plus a crosshair at zeta
func plotLinks(links []complex128, outputSize int, outputFile string, pointsOnly bool) {
	numWorkers := runtime.NumCPU() // Number of goroutines

	// Determine the min and max for x and y across all links.
	minX, maxX := real(links[0]), real(links[0])
	minY, maxY := imag(links[0]), imag(links[0])
	for _, link := range links {
		x := real(link)
		y := imag(link)
		if x < minX {
			minX = x
		}
		if x > maxX {
			maxX = x
		}
		if y < minY {
			minY = y
		}
		if y > maxY {
			maxY = y
		}
	}
	log.Printf("Link X range: [%f, %f], Y range: [%f, %f]\n", minX, maxX, minY, maxY)

	// Divide the links among workers.
	chunkSize := (len(links) + numWorkers - 1) / numWorkers

	// Each worker creates an image of the full output size with transparent background.
	workerImages := make([]*image.RGBA, numWorkers)
	var wg sync.WaitGroup
	for i := 0; i < numWorkers; i++ {
		start := i * chunkSize
		end := start + chunkSize
		if end > len(links) {
			end = len(links)
		}
		wg.Add(1)
		go func(worker, start, end int) {
			defer wg.Done()
			log.Printf("Worker %d drawing links from index %d to %d\n", worker, start, end)
			// Create full-size image with transparent background.
			img := image.NewRGBA(image.Rect(0, 0, outputSize, outputSize))
			// Clear image to transparent.
			gc := draw2dimg.NewGraphicContext(img)
			gc.SetFillColor(color.RGBA{0, 0, 0, 0})
			gc.Clear()

			// Set drawn line properties in white with higher base opacity
			if pointsOnly {
				gc.SetStrokeColor(color.RGBA{255, 255, 255, 255})
				gc.SetFillColor(color.RGBA{255, 255, 255, 255})
			} else {
				// Use higher base opacity (128 instead of 64) for better line accumulation
				gc.SetStrokeColor(color.RGBA{255, 255, 255, 128})
			}
			gc.SetLineWidth(0.5)

			// Draw the links in this chunk.
			if end > start {
				for j := start; j < end; j++ {
					x := real(links[j])
					y := imag(links[j])
					// Normalize x and y into [0, outputSize] based on overall range.
					normalizedX := (x - minX) / (maxX - minX) * float64(outputSize)
					normalizedY := (y - minY) / (maxY - minY) * float64(outputSize)
					// Invert Y because image coordinates start at top.
					finalX := normalizedX
					finalY := float64(outputSize) - normalizedY

					if pointsOnly {
						// Draw a small circle for each point
						gc.BeginPath()
						gc.ArcTo(finalX, finalY, 1.0, 1.0, 0, 2*math.Pi)
						gc.Close()
						gc.FillStroke()
					} else {
						if j == start {
							gc.MoveTo(finalX, finalY)
						} else {
							gc.LineTo(finalX, finalY)
						}
					}
				}
				if !pointsOnly {
					gc.Stroke()
				}
			} else {
				log.Printf("Worker %d has no links to draw\n", worker)
			}
			workerImages[worker] = img
		}(i, start, end)
	}
	wg.Wait()
	log.Println("All workers completed processing their chunks.")

	// Create the base final image with a solid dark grey background.
	finalImage := image.NewRGBA(image.Rect(0, 0, outputSize, outputSize))
	draw.Draw(finalImage, finalImage.Bounds(), &image.Uniform{color.RGBA{30, 30, 30, 255}}, image.Point{}, draw.Src)

	// Custom compositing function for additive blending
	additive := func(dst, src color.RGBA) color.RGBA {
		// Add the color values, clamping at 255
		r := uint8(math.Min(float64(dst.R)+float64(src.R), 255))
		g := uint8(math.Min(float64(dst.G)+float64(src.G), 255))
		b := uint8(math.Min(float64(dst.B)+float64(src.B), 255))
		a := uint8(math.Min(float64(dst.A)+float64(src.A), 255))
		return color.RGBA{r, g, b, a}
	}

	// Composite each worker's transparent image using parallel additive blending
	bounds := finalImage.Bounds()
	height := bounds.Dy()
	width := bounds.Dx()

	// Process images in parallel using worker pools
	var compositeWg sync.WaitGroup
	numCompositeWorkers := runtime.NumCPU()
	rowsPerWorker := (height + numCompositeWorkers - 1) / numCompositeWorkers

	for w := 0; w < numCompositeWorkers; w++ {
		compositeWg.Add(1)
		startY := w * rowsPerWorker
		endY := startY + rowsPerWorker
		if endY > height {
			endY = height
		}

		go func(startY, endY int) {
			defer compositeWg.Done()

			// Pre-calculate pixel offsets for the row
			for y := startY; y < endY; y++ {
				baseOffset := y * finalImage.Stride

				// Process each worker image
				for _, img := range workerImages {
					imgPixels := img.Pix
					for x := 0; x < width; x++ {
						offset := baseOffset + x*4

						// Skip if source pixel is fully transparent
						if imgPixels[offset+3] == 0 {
							continue
						}

						// Direct pixel access for better performance
						src := color.RGBA{
							imgPixels[offset+0],
							imgPixels[offset+1],
							imgPixels[offset+2],
							imgPixels[offset+3],
						}

						dst := color.RGBA{
							finalImage.Pix[offset+0],
							finalImage.Pix[offset+1],
							finalImage.Pix[offset+2],
							finalImage.Pix[offset+3],
						}

						result := additive(dst, src)

						finalImage.Pix[offset+0] = result.R
						finalImage.Pix[offset+1] = result.G
						finalImage.Pix[offset+2] = result.B
						finalImage.Pix[offset+3] = result.A
					}
				}
			}
		}(startY, endY)
	}

	compositeWg.Wait()
	log.Println("Compositing complete")

	// Create an overlay layer for axis markers and text (drawn in white).
	overlay := image.NewRGBA(image.Rect(0, 0, outputSize, outputSize))
	gcOverlay := draw2dimg.NewGraphicContext(overlay)
	gcOverlay.SetFillColor(color.RGBA{0, 0, 0, 0})
	gcOverlay.Clear()

	// Set white color for drawing on the overlay.
	gcOverlay.SetStrokeColor(color.White)
	gcOverlay.SetFillColor(color.White)
	gcOverlay.SetLineWidth(2)
	gcOverlay.SetFontData(draw2d.FontData{
		Name:   "Arial",
		Family: draw2d.FontFamilySans,
		Style:  draw2d.FontStyleNormal,
	})
	gcOverlay.SetFontSize(14)

	// Draw simple axis markers:
	// X-axis: if 0 is in the y-range, draw a horizontal line.
	if minY <= 0 && maxY >= 0 {
		normalizedY := (0 - minY) / (maxY - minY) * float64(outputSize)
		y0 := float64(outputSize) - normalizedY
		gcOverlay.SetLineWidth(1)
		gcOverlay.SetStrokeColor(color.RGBA{30, 30, 30, 66})
		gcOverlay.MoveTo(0, y0)
		gcOverlay.LineTo(float64(outputSize), y0)
		gcOverlay.Stroke()
	}
	// Y-axis: if 0 is in the x-range, draw a vertical line.
	if minX <= 0 && maxX >= 0 {
		normalizedX := (0 - minX) / (maxX - minX) * float64(outputSize)
		gcOverlay.SetLineWidth(1)
		gcOverlay.SetStrokeColor(color.RGBA{30, 30, 30, 66})
		gcOverlay.MoveTo(normalizedX, 0)
		gcOverlay.LineTo(normalizedX, float64(outputSize))
		gcOverlay.Stroke()
	}

	// Composite the overlay onto the final image.
	draw.Draw(finalImage, finalImage.Bounds(), overlay, image.Point{}, draw.Over)

	log.Printf("Final image dimensions: %dx%d\n", finalImage.Bounds().Dx(), finalImage.Bounds().Dy())

	// Save the final image.
	outFile, err := os.Create(outputFile)
	if err != nil {
		log.Fatalf("failed to create output file: %v", err)
	}
	defer outFile.Close()

	if err := png.Encode(outFile, finalImage); err != nil {
		log.Fatalf("failed to encode image: %v", err)
	}

	log.Println("Image saved as", outputFile)
}

// Point represents a 2D point.
type Point struct {
	X, Y float64
}

// downsample simulates averaging groups of points (mimicking the compute shader logic).
// Given a slice of points and a groupSize, it returns a slice of averaged points.
func downsample(points []Point, groupSize int) []Point {
	n := len(points)
	outputCount := n / groupSize
	result := make([]Point, 0, outputCount)
	for i := 0; i < outputCount; i++ {
		var sumX, sumY float64
		start := i * groupSize
		end := start + groupSize
		for j := start; j < end; j++ {
			sumX += points[j].X
			sumY += points[j].Y
		}
		result = append(result, Point{
			X: sumX / float64(groupSize),
			Y: sumY / float64(groupSize),
		})
	}
	return result
}

// downsampleComplexSerial is the original serial version of the downsampling algorithm
func downsampleComplexSerial(links []complex128, outputSize int, aggressiveness float64, debug bool) []complex128 {
	if len(links) == 0 {
		return links
	}

	if debug {
		log.Printf("Starting downsampleComplexSerial with %d links and output size %d (aggressiveness: %.2f)",
			len(links), outputSize, aggressiveness)
	}

	// Determine view bounds from the links.
	minX, maxX := real(links[0]), real(links[0])
	minY, maxY := imag(links[0]), imag(links[0])
	for _, link := range links {
		x := real(link)
		y := imag(link)
		if x < minX {
			minX = x
		}
		if x > maxX {
			maxX = x
		}
		if y < minY {
			minY = y
		}
		if y > maxY {
			maxY = y
		}
	}

	// Calculate relative distance between points
	maxRange := math.Max(maxX-minX, maxY-minY)
	baseRange := math.Max(0.01, maxRange)
	relativeSpread := maxRange / baseRange

	// Scale the maxRelativeSpread based on aggressiveness
	maxRelativeSpread := 0.0001 // Base threshold at 0.01%
	if aggressiveness > 0.0 {
		maxRelativeSpread *= math.Pow(5, aggressiveness)
	}

	// Add extra smoothing for values between 3.5 and 4.0
	if aggressiveness > 3.5 {
		t := (aggressiveness - 3.5) / 0.5
		maxRelativeSpread = 0.03 + (0.02 * t)
	}

	// Also consider pixel-space proximity for grouping
	pixelSpreadThreshold := 1.0
	if aggressiveness > 0.0 {
		pixelSpreadThreshold += (aggressiveness * 2.0)
	}

	// If the relative spread is small enough, average all points
	if relativeSpread <= maxRelativeSpread {
		var sum complex128
		for _, link := range links {
			sum += link
		}
		avg := sum / complex(float64(len(links)), 0)
		return []complex128{avg}
	}

	// Helper to compute pixel coordinate for a link
	pixelForLink := func(link complex128) (int, int) {
		normalizedX := (real(link) - minX) / (maxX - minX)
		normalizedY := (imag(link) - minY) / (maxY - minY)
		px := int(math.Round(normalizedX * float64(outputSize)))
		py := int(math.Round(normalizedY * float64(outputSize)))
		return px, py
	}

	// Calculate interpolation threshold based on aggressiveness
	interpolationThreshold := 1.1 * math.Pow(2.5, aggressiveness)
	if aggressiveness > 3.5 {
		t := (aggressiveness - 3.5) / 0.5
		interpolationThreshold = 55.0 + (20.0 * t)
	}

	var downsampled []complex128
	type groupData struct {
		sum      complex128
		count    int
		pixelX   int
		pixelY   int
		lastLink complex128
	}

	// Initialize with first point
	initPx, initPy := pixelForLink(links[0])
	currentGroup := groupData{
		sum:      links[0],
		count:    1,
		pixelX:   initPx,
		pixelY:   initPy,
		lastLink: links[0],
	}

	// Helper to flush a group
	flushGroup := func(g groupData) complex128 {
		return g.sum / complex(float64(g.count), 0)
	}

	// Process all points sequentially
	for i := 1; i < len(links); i++ {
		link := links[i]
		px, py := pixelForLink(link)

		// Check if this point belongs to current group
		if px == currentGroup.pixelX && py == currentGroup.pixelY ||
			(math.Abs(float64(px-currentGroup.pixelX)) <= pixelSpreadThreshold &&
				math.Abs(float64(py-currentGroup.pixelY)) <= pixelSpreadThreshold) {
			currentGroup.sum += link
			currentGroup.count++
			currentGroup.lastLink = link
			continue
		}

		// Group changed: flush current group
		avg := flushGroup(currentGroup)
		downsampled = append(downsampled, avg)

		// Check for interpolation
		dx := px - currentGroup.pixelX
		dy := py - currentGroup.pixelY
		pixelGap := math.Sqrt(float64(dx*dx + dy*dy))

		if pixelGap > interpolationThreshold {
			steps := int(pixelGap / math.Pow(2, math.Min(aggressiveness, 3.5)))
			if aggressiveness > 3.5 {
				t := (aggressiveness - 3.5) / 0.5
				steps = int(float64(steps) * (1.0 - (0.5 * t)))
			}

			for s := 1; s <= steps; s++ {
				t := float64(s) / float64(steps+1)
				interp := currentGroup.lastLink*(1-complex(t, 0)) + link*complex(t, 0)
				downsampled = append(downsampled, interp)
			}
		}

		// Start new group
		currentGroup = groupData{
			sum:      link,
			count:    1,
			pixelX:   px,
			pixelY:   py,
			lastLink: link,
		}
	}

	// Flush final group
	finalAvg := flushGroup(currentGroup)
	downsampled = append(downsampled, finalAvg)

	if debug {
		log.Printf("Downsampled %d points to %d points", len(links), len(downsampled))
	}
	return downsampled
}

// downsampleComplex uses the view bounds (computed from all links) and the output image size,
// so that only links that fall within the same pixel are averaged. Additionally, if two adjacent
// groups are separated by more than one pixel, it linearly interpolates extra points.
// aggressiveness controls how much reduction to do (0.0 = minimal, 1.0 = maximum)
func downsampleComplex(links []complex128, outputSize int, aggressiveness float64, debug bool) []complex128 {

	// There is not much point in parallelizing for small numbers of links - benefits are minimal
	if len(links) < 10000 {
		return downsampleComplexSerial(links, outputSize, aggressiveness, debug)
	}

	if debug {
		log.Printf("Starting downsampleComplex with %d links and output size %d (aggressiveness: %.2f)",
			len(links), outputSize, aggressiveness)
	}

	// Determine view bounds from the links.
	minX, maxX := real(links[0]), real(links[0])
	minY, maxY := imag(links[0]), imag(links[0])
	for _, link := range links {
		x := real(link)
		y := imag(link)
		if x < minX {
			minX = x
		}
		if x > maxX {
			maxX = x
		}
		if y < minY {
			minY = y
		}
		if y > maxY {
			maxY = y
		}
	}
	if debug {
		log.Printf("View bounds: minX=%.6f, maxX=%.6f, minY=%.6f, maxY=%.6f", minX, maxX, minY, maxY)
	}

	// Calculate relative distance between points
	maxRange := math.Max(maxX-minX, maxY-minY)
	baseRange := math.Max(0.01, maxRange)
	relativeSpread := maxRange / baseRange
	if debug {
		log.Printf("Relative calculations: maxRange=%e, baseRange=%e, relativeSpread=%e", maxRange, baseRange, relativeSpread)
	}

	// Scale the maxRelativeSpread based on aggressiveness
	maxRelativeSpread := 0.0001 // Base threshold at 0.01%
	if aggressiveness > 0.0 {
		maxRelativeSpread *= math.Pow(5, aggressiveness)
	}

	// Add extra smoothing for values between 3.5 and 4.0
	if aggressiveness > 3.5 {
		t := (aggressiveness - 3.5) / 0.5
		maxRelativeSpread = 0.03 + (0.02 * t)
	}

	// Also consider pixel-space proximity for grouping
	pixelSpreadThreshold := 1.0
	if aggressiveness > 0.0 {
		pixelSpreadThreshold += (aggressiveness * 2.0)
	}

	if debug {
		log.Printf("Using maxRelativeSpread=%e based on aggressiveness=%.2f", maxRelativeSpread, aggressiveness)
	}

	// If the relative spread is small enough, average all points
	if relativeSpread <= maxRelativeSpread {
		if debug {
			log.Printf("Points are relatively close: %e <= %e", relativeSpread, maxRelativeSpread)
		}
		var sum complex128
		for _, link := range links {
			sum += link
		}
		avg := sum / complex(float64(len(links)), 0)
		if debug {
			log.Printf("Computed average of %d points: %.6f + %.6fi", len(links), real(avg), imag(avg))
		}
		return []complex128{avg}
	}

	// Helper to compute pixel coordinate for a link.
	pixelForLink := func(link complex128) (int, int) {
		normalizedX := (real(link) - minX) / (maxX - minX)
		normalizedY := (imag(link) - minY) / (maxY - minY)
		px := int(math.Round(normalizedX * float64(outputSize)))
		py := int(math.Round(normalizedY * float64(outputSize)))
		return px, py
	}

	// Calculate interpolation threshold based on aggressiveness
	interpolationThreshold := 1.1 * math.Pow(2.5, aggressiveness)
	if aggressiveness > 3.5 {
		t := (aggressiveness - 3.5) / 0.5
		interpolationThreshold = 55.0 + (20.0 * t)
	}

	// Process chunks in parallel
	numWorkers := runtime.NumCPU()
	chunkSize := (len(links) + numWorkers - 1) / numWorkers

	type chunkResult struct {
		index     int
		points    []complex128
		lastPoint complex128
		lastPx    int
		lastPy    int
	}

	results := make(chan chunkResult, numWorkers)
	var wg sync.WaitGroup

	// Process each chunk
	for w := 0; w < numWorkers; w++ {
		wg.Add(1)
		start := w * chunkSize
		end := start + chunkSize
		if end > len(links) {
			end = len(links)
		}

		go func(worker, start, end int) {
			defer wg.Done()

			if start >= end {
				results <- chunkResult{index: worker}
				return
			}

			// Initialize chunk processing
			var chunkPoints []complex128
			type groupData struct {
				sum      complex128
				count    int
				pixelX   int
				pixelY   int
				lastLink complex128
			}

			// Start with the first point in the chunk
			initPx, initPy := pixelForLink(links[start])
			currentGroup := groupData{
				sum:      links[start],
				count:    1,
				pixelX:   initPx,
				pixelY:   initPy,
				lastLink: links[start],
			}

			// Helper to flush a group
			flushGroup := func(g groupData) complex128 {
				return g.sum / complex(float64(g.count), 0)
			}

			// Process points in the chunk
			for i := start + 1; i < end; i++ {
				link := links[i]
				px, py := pixelForLink(link)

				// Check if this point belongs to current group
				if px == currentGroup.pixelX && py == currentGroup.pixelY ||
					(math.Abs(float64(px-currentGroup.pixelX)) <= pixelSpreadThreshold &&
						math.Abs(float64(py-currentGroup.pixelY)) <= pixelSpreadThreshold) {
					currentGroup.sum += link
					currentGroup.count++
					currentGroup.lastLink = link
					continue
				}

				// Group changed: flush current group
				avg := flushGroup(currentGroup)
				chunkPoints = append(chunkPoints, avg)

				// Check for interpolation
				dx := px - currentGroup.pixelX
				dy := py - currentGroup.pixelY
				pixelGap := math.Sqrt(float64(dx*dx + dy*dy))

				if pixelGap > interpolationThreshold {
					steps := int(pixelGap / math.Pow(2, math.Min(aggressiveness, 3.5)))
					if aggressiveness > 3.5 {
						t := (aggressiveness - 3.5) / 0.5
						steps = int(float64(steps) * (1.0 - (0.5 * t)))
					}

					for s := 1; s <= steps; s++ {
						t := float64(s) / float64(steps+1)
						interp := currentGroup.lastLink*(1-complex(t, 0)) + link*complex(t, 0)
						chunkPoints = append(chunkPoints, interp)
					}
				}

				// Start new group
				currentGroup = groupData{
					sum:      link,
					count:    1,
					pixelX:   px,
					pixelY:   py,
					lastLink: link,
				}
			}

			// Flush final group
			finalAvg := flushGroup(currentGroup)
			chunkPoints = append(chunkPoints, finalAvg)

			results <- chunkResult{
				index:     worker,
				points:    chunkPoints,
				lastPoint: currentGroup.lastLink,
				lastPx:    currentGroup.pixelX,
				lastPy:    currentGroup.pixelY,
			}
		}(w, start, end)
	}

	// Close results channel when all workers are done
	go func() {
		wg.Wait()
		close(results)
	}()

	// Collect and merge results
	type collectedResult struct {
		points    []complex128
		lastPoint complex128
		lastPx    int
		lastPy    int
	}
	collected := make([]collectedResult, numWorkers)

	// Collect all results
	for result := range results {
		collected[result.index] = collectedResult{
			points:    result.points,
			lastPoint: result.lastPoint,
			lastPx:    result.lastPx,
			lastPy:    result.lastPy,
		}
	}

	// Merge results with interpolation between chunks
	var finalPoints []complex128
	for i := 0; i < len(collected); i++ {
		if len(collected[i].points) == 0 {
			continue
		}

		// Add points from this chunk
		finalPoints = append(finalPoints, collected[i].points...)

		// If not the last chunk and next chunk has points, check if interpolation is needed
		if i < len(collected)-1 && len(collected[i+1].points) > 0 {
			// Check distance between chunks
			dx := collected[i+1].lastPx - collected[i].lastPx
			dy := collected[i+1].lastPy - collected[i].lastPy
			gap := math.Sqrt(float64(dx*dx + dy*dy))

			if gap > interpolationThreshold {
				steps := int(gap / math.Pow(2, math.Min(aggressiveness, 3.5)))
				if aggressiveness > 3.5 {
					t := (aggressiveness - 3.5) / 0.5
					steps = int(float64(steps) * (1.0 - (0.5 * t)))
				}

				nextFirstPoint := collected[i+1].points[0]
				for s := 1; s <= steps; s++ {
					t := float64(s) / float64(steps+1)
					interp := collected[i].lastPoint*(1-complex(t, 0)) + nextFirstPoint*complex(t, 0)
					finalPoints = append(finalPoints, interp)
				}
			}
		}
	}

	if debug {
		log.Printf("Downsampled %d points to %d points", len(links), len(finalPoints))
	}
	return finalPoints
}

func main() {
	// Read command-line flags
	imagPart := flag.Float64("imag", 6_300_000.0, "Imaginary part of the complex number")
	maxN := flag.Int("maxN", 65_000_000_000, "Maximum number of terms")
	downsampleFlag := flag.Bool("downsample", false, "Enable downsampling of links")
	aggressiveness := flag.Float64("aggressive", 0.5, "Downsampling aggressiveness (0.0-1.0)")
	outputFile := flag.String("output", "combined_links.png", "Output filename for the image")
	outputSize := flag.Int("size", 2048, "Output image size in pixels")
	debugFlag := flag.Bool("debug", false, "Enable debug logging")
	pointsOnlyFlag := flag.Bool("points", false, "Draw points only, no lines")
	saveDeltaFlag := flag.String("save-delta", "", "Save spiral data using delta compression (optional)")
	saveMsgPackFlag := flag.String("save-msgpack", "", "Save spiral data using MessagePack (optional)")
	flag.Parse()

	// Set MaxN from the command-line flag
	MaxN = *maxN

	start := time.Now()

	// Example complex number with real part 0.5
	s := complex(0.5, *imagPart)

	// Multi-threaded
	result, multiThreadedLinks := calculateSpiralPartialSums(s)

	// Downsample if the flag is set
	if *downsampleFlag {
		// Use the same resolution as the final output image.
		before := len(multiThreadedLinks)

		// Use parallel version by default, but allow fallback to serial for debugging
		if *debugFlag {
			multiThreadedLinks = downsampleComplexSerial(multiThreadedLinks, *outputSize, *aggressiveness, *debugFlag)
		} else {
			multiThreadedLinks = downsampleComplex(multiThreadedLinks, *outputSize, *aggressiveness, *debugFlag)
		}

		after := len(multiThreadedLinks)
		// Calculate downsampling statistics
		reductionRatio := float64(before) / float64(after)
		memoryBefore := before * 16 // complex128 = 16 bytes
		memoryAfter := after * 16
		memorySaved := float64(memoryBefore-memoryAfter) / 1024.0 // Convert to KB

		fmt.Printf("\nDownsampling Statistics (aggressiveness=%.2f):\n", *aggressiveness)
		fmt.Printf("Points reduced: %d → %d\n", before, after)
		fmt.Printf("Reduction ratio: %.2fx\n", reductionRatio)
		fmt.Printf("Memory saved: %.2f KB\n", memorySaved)
		fmt.Printf("Average distance between points: %.6f\n",
			math.Sqrt(math.Pow(real(multiThreadedLinks[len(multiThreadedLinks)-1]-multiThreadedLinks[0]), 2)+
				math.Pow(imag(multiThreadedLinks[len(multiThreadedLinks)-1]-multiThreadedLinks[0]), 2))/float64(len(multiThreadedLinks)))
		fmt.Printf("Maintained visual quality while using %.1f%% fewer points\n",
			100.0*(1.0-float64(after)/float64(before)))
	}

	// Print the final result
	fmt.Printf("\nEuler-Maclaurin result: (%.6f, %.6f)\n", real(result), imag(result))
	elapsed := time.Since(start)
	fps := 1.0 / elapsed.Seconds()
	fmt.Printf("Time taken: %v FPS: %.2f\n", elapsed, fps)

	if *saveDeltaFlag != "" {
		start := time.Now()
		compressed, err := compression.CompressWithDelta(multiThreadedLinks)
		if err != nil {
			log.Printf("Error compressing with delta encoding: %v", err)
		} else {
			if err := compression.SaveDeltaCompressed(compressed, *saveDeltaFlag); err != nil {
				log.Printf("Error saving delta compressed data: %v", err)
			} else {
				elapsed := time.Since(start)
				log.Printf("Saved delta compressed data to %s (took %v)", *saveDeltaFlag, elapsed)
			}
		}
	}

	if *saveMsgPackFlag != "" {
		start := time.Now()
		compressed, err := compression.CompressWithMsgPack(multiThreadedLinks)
		if err != nil {
			log.Printf("Error compressing with MessagePack: %v", err)
		} else {
			if err := compression.SaveMsgPack(compressed, *saveMsgPackFlag); err != nil {
				log.Printf("Error saving MessagePack data: %v", err)
			} else {
				elapsed := time.Since(start)
				log.Printf("Saved MessagePack data to %s (took %v)", *saveMsgPackFlag, elapsed)
			}
		}
	}

	// Plot
	start = time.Now()
	println("\nPlotting multi-threaded links")
	multiThreadedLinks = append([]complex128{complex(0, 0)}, multiThreadedLinks...)
	plotLinks(multiThreadedLinks, *outputSize, *outputFile, *pointsOnlyFlag) // Pass the points-only flag
	elapsed = time.Since(start)
	fps = 1.0 / elapsed.Seconds()
	fmt.Printf("Time taken: %v FPS: %.2f\n", elapsed, fps)
}
