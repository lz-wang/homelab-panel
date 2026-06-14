package main

import (
	"embed"
	"fmt"
	"homelab-panel/internal/app"
	"homelab-panel/internal/app/global"
	"homelab-panel/internal/server/router"
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

//go:embed all:web/dist
var webFS embed.FS

func main() {
	global.Version = version
	global.WebFS = webFS

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
	global.DataDir = c.String("dir")

	if err := app.InitApp(); err != nil {
		return fmt.Errorf("初始化错误: %w", err)
	}

	httpPort := c.String("port")
	if err := router.InitRouters(":" + httpPort); err != nil {
		return err
	}
	return nil
}

func runPasswordReset(_ *cli.Context) error {
	return app.ResetAdminPassword()
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
