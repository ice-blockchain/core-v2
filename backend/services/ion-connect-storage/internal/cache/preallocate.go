package cache

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// preallocateFiles creates and truncates all data files for a bag's layout.
func preallocateFiles(dirPath string, layout BagFileLayout) error {
	for _, f := range layout.Files {
		if err := validateFileName(f.Name); err != nil {
			return fmt.Errorf("invalid file name %q: %w", f.Name, err)
		}
		fullPath := filepath.Join(dirPath, f.Name)
		if err := ensurePathInside(dirPath, fullPath); err != nil {
			return err
		}
		if err := createTruncatedFile(fullPath, int64(f.Size)); err != nil {
			return fmt.Errorf("preallocate %s: %w", f.Name, err)
		}
	}
	return nil
}

func validateFileName(name string) error {
	if name == "" {
		return fmt.Errorf("empty file name")
	}
	if strings.Contains(name, "..") {
		return fmt.Errorf("contains '..'")
	}
	if filepath.IsAbs(name) {
		return fmt.Errorf("absolute path")
	}
	return nil
}

func ensurePathInside(base, target string) error {
	absBase, err := filepath.Abs(base)
	if err != nil {
		return fmt.Errorf("resolve base path: %w", err)
	}
	absTarget, err := filepath.Abs(target)
	if err != nil {
		return fmt.Errorf("resolve target path: %w", err)
	}
	if !strings.HasPrefix(absTarget, absBase+string(filepath.Separator)) && absTarget != absBase {
		return fmt.Errorf("path traversal: %s escapes %s", target, base)
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
