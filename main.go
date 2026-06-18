package main

import (
	"embed"
	"io/fs"
	"log"
	"os"

	"homelab-panel/internal/app"

	"github.com/urfave/cli/v2"
)

//go:embed web/dist/*
var webFS embed.FS

var version = "dev"

func main() {
	cliApp := &cli.App{
		Name:    "homelab-panel",
		Usage:   "Homelab panel service",
		Version: version,
		Commands: []*cli.Command{
			{
				Name:  "serve",
				Usage: "Start the HTTP service",
				Flags: []cli.Flag{
					&cli.StringFlag{
						Name:    "port",
						Aliases: []string{"p"},
						Usage:   "HTTP listen port",
						Value:   "3002",
					},
					&cli.StringFlag{
						Name:    "dir",
						Aliases: []string{"d"},
						Usage:   "Data directory (contains homelab-panel.json and uploads/)",
						Value:   "./data",
					},
				},
				Action: runServe,
			},
			{
				Name:   "version",
				Usage:  "Print build version",
				Action: runVersion,
			},
		},
	}

	if err := cliApp.Run(os.Args); err != nil {
		log.Fatal(err)
	}
}

func runServe(c *cli.Context) error {
	staticFS, err := fs.Sub(webFS, "web/dist")
	if err != nil {
		return err
	}

	cfg := app.Config{
		Port:    c.String("port"),
		DataDir: c.String("dir"),
		Version: version,
		WebFS:   staticFS,
	}
	return app.Run(c.Context, cfg)
}

func runVersion(c *cli.Context) error {
	c.App.Writer.Write([]byte(version + "\n"))
	return nil
}
