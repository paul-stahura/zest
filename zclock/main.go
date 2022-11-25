package main

import (
	"bufio"
	"fmt"
	"math"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/faiface/pixel"
	"github.com/faiface/pixel/imdraw"
	"github.com/faiface/pixel/pixelgl"
	"golang.org/x/image/colornames"
)

var win *pixelgl.Window

func run() {
	cfg := pixelgl.WindowConfig{
		Title:  "Pixel Rocks!",
		Bounds: pixel.R(0, 0, 1024, 768),
		VSync:  true,
	}
	var err error
	win, err = pixelgl.NewWindow(cfg)
	if err != nil {
		panic(err)
	}
	win.SetSmooth(true)

	imd := imdraw.New(nil)
	imd.EndShape = imdraw.RoundEndShape

	scale := pixel.V(100, 100)

	// hour : red
	// min : orange
	// sec : green

	last := time.Unix(0, 0)

	for !win.Closed() {

		if time.Since(last) >= time.Second {
			last = time.Now()

			now := time.Now()
			midnight := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.Local) // % int64(time.Hour*24/time.Second)
			secs := int64(time.Since(midnight)/time.Second) % int64(12*time.Hour/time.Second)

			dat := times[secs]
			fmt.Println(secs, dat)

			s := spiral(complex(.5, dat.imaginary))
			mi := dat.index
			fmt.Println("mi", mi, "links", len(s))

			mat := pixel.IM
			// mat = mat.Moved(win.Bounds().Center()).ScaledXY(center, scale)
			center := win.Bounds().Center().Sub(s[mi+1].ScaledXY(scale))

			mat = mat.Moved(center).ScaledXY(center, scale)
			// mat = mat.Moved(s[mi])
			win.SetMatrix(mat)

			imd.Clear()
			imd.Color = pixel.RGB(.5, .5, .5)
			for link := range s {
				imd.Push(s[link])
			}
			imd.Line(.01)

			imd.Color = pixel.RGB(0, 1, 0)
			imd.Push(s[mi-1])
			imd.Push(s[mi])

			imd.Color = pixel.RGB(1, .5, 0)
			imd.Push(s[mi])
			imd.Push(s[mi+1])

			imd.Color = pixel.RGB(1, 0, 0)
			imd.Push(s[mi+1])
			imd.Push(s[mi+2])
			imd.Line(.05)

		}

		win.Clear(colornames.Black)
		imd.Draw(win)
		win.Update()
	}
}

func timeFromSpiral(s []pixel.Vec, mi int) (hour, min, sec int) {
	RAD2DEG := 180 / math.Pi

	link := s[mi+2].Sub(s[mi+1])
	deg := math.Atan2(link.Y, link.X)*RAD2DEG - 90
	if deg < 0 {
		deg += 360
	}
	hour = (360 - int(deg)/30) % 12

	link = s[mi].Sub(s[mi+1])
	deg = math.Atan2(link.Y, link.X)*RAD2DEG - 90
	if deg < 0 {
		deg += 360
	}
	min = (360 - int(deg)/6) % 60

	link = s[mi-1].Sub(s[mi])
	deg = math.Atan2(link.Y, link.X)*RAD2DEG - 90
	if deg < 0 {
		deg += 360
	}
	sec = (360 - int(deg)/6) % 60
	return
}

type data struct {
	index     int
	imaginary float64
}

var times map[int64]data

func main() {
	times = map[int64]data{}

	calcData()
	// loadData()

	pixelgl.Run(run)
}

func calcData() {
	f, err := os.Create("data.csv")

	if err != nil {
		fmt.Println(err)
	}

	// close the file with defer
	defer f.Close()

	// fmt.Println("key for 1am:", int64(time.Hour*time.Duration(1)/time.Second))

	i := indexToImag(4)
	last := time.Now()
	count := 0
	elapsed := 0.0

	minKey := int64(math.MaxInt64)
	maxKey := int64(0)

	for {
		dt := time.Since(last).Seconds()
		last = time.Now()

		s := spiral(complex(.5, i))

		for mi := int(imagToIndex(i)); mi < len(s)/2; mi++ {

			hour, min, sec := timeFromSpiral(s, mi)

			key := int64(time.Hour * time.Duration(hour))
			key += int64(time.Minute * time.Duration(min))
			key += int64(time.Second * time.Duration(sec))
			key /= int64(time.Second)

			if key < int64(minKey) {
				minKey = key
			}
			if key > int64(maxKey) {
				maxKey = key
			}

			count++
			if elapsed >= 1 {
				fmt.Println(count, "per second. count:", len(times), "imag:", i, " index:", imagToIndex(i), " last key:", key)
				count = 0
				elapsed = 0
			}

			if _, ok := times[key]; ok {
				// fmt.Println("duplicate", int(key), i)
				continue
			}

			times[key] = data{index: mi, imaginary: i}
			f.WriteString(fmt.Sprintf("%d,%d,%f\n", key, mi, i))
		}

		i += .0005
		elapsed += dt

		if len(times) >= 43200 {
			break
		}
	}

	fmt.Println("min key:", minKey, "max key:", maxKey)
}

func loadData() {
	f, err := os.Open("data.csv")
	if err != nil {
		fmt.Println(err)
	}
	defer f.Close()

	fileScanner := bufio.NewScanner(f)
	fileScanner.Split(bufio.ScanLines)
	for fileScanner.Scan() {
		line := fileScanner.Text()
		tokens := strings.Split(line, ",")
		key, _ := strconv.ParseInt(tokens[0], 0, 64)
		mi, _ := strconv.ParseInt(tokens[1], 0, 64)
		i, _ := strconv.ParseFloat(tokens[2], 64)

		times[key] = data{index: int(mi), imaginary: i}
	}
}
