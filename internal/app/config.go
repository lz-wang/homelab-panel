package app

import "io/fs"

type Config struct {
	Port    string
	DataDir string
	Version string
	WebFS   fs.FS
	GoMod   string
}

func (c Config) address() string {
	if c.Port == "" {
		return ":9090"
	}
	return ":" + c.Port
}

func (c Config) dataDir() string {
	if c.DataDir == "" {
		return "./data"
	}
	return c.DataDir
}
