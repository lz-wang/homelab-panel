package app

import "io/fs"

type Config struct {
	Port    string
	DataDir string
	Version string
	WebFS   fs.FS
}

func (c Config) address() string {
	if c.Port == "" {
		return ":3002"
	}
	return ":" + c.Port
}

func (c Config) dataDir() string {
	if c.DataDir == "" {
		return "./data"
	}
	return c.DataDir
}
