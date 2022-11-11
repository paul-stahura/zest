package main

import "fmt"

func main() {
	imag := 206.4912
	z := reimannSiegel(imag)

	fmt.Println(imag, z)
}
