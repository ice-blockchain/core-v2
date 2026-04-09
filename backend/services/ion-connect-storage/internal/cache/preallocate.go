package cache

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

const (
	maxPreallocTotalSize = 10 << 30 // 10 GB per bag
	maxPreallocFileCount = 10_000
)

// preallocateFiles creates and truncates all data files for a bag's layout.
func preallocateFiles(dirPath string, layout BagFileLayout) error {
	if len(layout.Files) > maxPreallocFileCount {
		return fmt.Errorf("too many files in bag: %d (max %d)", len(layout.Files), maxPreallocFileCount)
	}
	var totalSize uint64
	for _, f := range layout.Files {
		totalSize += f.Size
		if totalSize > maxPreallocTotalSize {
			return fmt.Errorf("bag total size %d exceeds max %d", totalSize, maxPreallocTotalSize)
		}
	}
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
	// EvalSymlinks resolves symlinks AND returns absolute paths,
	// preventing traversal via symlink chains.
	absBase, err := filepath.EvalSymlinks(base)
	if err != nil {
		return fmt.Errorf("resolve base path: %w", err)
	}
	// Target file (and its parent dirs) may not exist yet. Walk up the path
	// until we find an existing ancestor, resolve symlinks there, then
	// reconstruct the remainder.
	absTarget, err := evalSymlinksPartial(target)
	if err != nil {
		return fmt.Errorf("resolve target path: %w", err)
	}
	if !strings.HasPrefix(absTarget, absBase+string(filepath.Separator)) && absTarget != absBase {
		return fmt.Errorf("path traversal: %s escapes %s", target, base)
	}
	return nil
}

// evalSymlinksPartial resolves symlinks on the longest existing prefix of
// path, then appends the non-existent suffix. This handles paths where
// intermediate directories haven't been created yet.
func evalSymlinksPartial(path string) (string, error) {
	absPath, err := filepath.Abs(path)
	if err != nil {
		return "", err
	}
	resolved, err := filepath.EvalSymlinks(absPath)
	if err == nil {
		return resolved, nil
	}
	// Walk up to find existing ancestor.
	dir := filepath.Dir(absPath)
	base := filepath.Base(absPath)
	resolvedDir, err := evalSymlinksPartial(dir)
	if err != nil {
		return "", err
	}
	return filepath.Join(resolvedDir, base), nil
}

func createTruncatedFile(path string, size int64) error {
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}
	f, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0o644)
	if err != nil {
		return err
	}
	defer f.Close()
	return f.Truncate(size)
}
