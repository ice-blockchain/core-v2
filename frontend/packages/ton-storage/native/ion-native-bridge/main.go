package main

/*
#include <stdlib.h>
*/
import "C"
import "unsafe"

// Required for C shared/archive library
func main() {}

//export FreeString
func FreeString(p unsafe.Pointer) {
	C.free(p)
}
