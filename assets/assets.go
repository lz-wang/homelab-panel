package assets

import (
	"errors"
	"io/fs"
)

var FS fs.FS

func Asset(name string) ([]byte, error) {
	if FS == nil {
		return nil, errors.New("embedded assets filesystem is not initialized")
	}
	return fs.ReadFile(FS, name)
}
