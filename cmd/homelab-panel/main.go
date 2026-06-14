package main

import (
	"fmt"
	"homelab-panel/internal/app"
	"log"
	"os"

	"github.com/urfave/cli/v2"
)

var version = "dev"

// @title Homelab Panel API
// @version 1.0
// @description Homelab Panel HTTP API.
// @BasePath /api
// @securityDefinitions.apikey ApiTokenAuth
// @in header
// @name token

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
						Usage:   "Data directory (contains data.db and uploads/)",
						Value:   "./data",
					},
				},
				Action: runServe,
			},
			{
				Name:   "password-reset",
				Usage:  "Reset the first admin user's password",
				Action: runPasswordReset,
			},
			{
				Name:   "version",
				Usage:  "Print build version",
				Action: runVersion,
			},
		},
	}

	if err := cliApp.Run(normalizeArgs(os.Args)); err != nil {
		log.Fatal(err)
	}
}

func runServe(c *cli.Context) error {
	cfg := app.Config{
		Port:    c.String("port"),
		DataDir: c.String("dir"),
		Version: version,
		WebFS:   os.DirFS("web/dist"),
	}
	return app.Run(c.Context, cfg)
}

func runPasswordReset(_ *cli.Context) error {
	return fmt.Errorf("password reset is not implemented for the rewritten backend")
}

func runVersion(c *cli.Context) error {
	fmt.Fprintln(c.App.Writer, version)
	return nil
}

func normalizeArgs(args []string) []string {
	if len(args) == 1 {
		return append(args, "serve")
	}

	normalized := append([]string(nil), args...)
	switch normalized[1] {
	case "--password-reset":
		normalized[1] = "password-reset"
	}
	return normalized
}
