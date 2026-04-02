package cache

import (
	"fmt"
	"os"
	"path/filepath"
)

// preallocateFiles creates and truncates all data files for a bag's layout.
func preallocateFiles(dirPath string, layout BagFileLayout) error {
	for _, f := range layout.Files {
		if err := createTruncatedFile(filepath.Join(dirPath, f.Name), int64(f.Size)); err != nil {
			return fmt.Errorf("preallocate %s: %w", f.Name, err)
		}
	}
	return nil
}

func createTruncatedFile(path string, size int64) error {
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()
	return f.Truncate(size)
}
