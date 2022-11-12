package main

import (
	"fmt"
	"math"
)

const RAD2DEG = math.Pi / 180

func main() {
	imag := 126.7092 // index = 4

	mi := int(imagToIndex(imag))
	s := spiral(imag, mi+2)

	l := s[mi+2].Sub(s[mi+1])
	deg := math.Atan2(l[1], l[0])*RAD2DEG - 90
	if deg < 0 {
		deg += 360
	}
	hour := int(360-deg/30) % 12

	l = s[mi].Sub(s[mi+1])
	deg = math.Atan2(l[1], l[0])*RAD2DEG - 90
	if deg < 0 {
		deg += 360
	}
	min := int(360-deg/6) % 60

	l = s[mi-1].Sub(s[mi])
	deg = math.Atan2(l[1], l[0])*RAD2DEG - 90
	if deg < 0 {
		deg += 360
	}
	sec := int(360-deg/6) % 60

	fmt.Println(hour, min, sec)
}
