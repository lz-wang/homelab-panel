package main

import (
	"embed"
	"fmt"
	"homelab-panel/internal/app"
	"homelab-panel/internal/app/global"
	appConfig "homelab-panel/internal/config"
	"homelab-panel/internal/server/router"
	embeddedAssets "homelab-panel/internal/webui/assets"
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

//go:embed config.example.yaml internal/webui/assets/lang/zh-cn.ini internal/webui/assets/version
var assetsFS embed.FS

func main() {
	global.Version = version
	global.WebFS = webFS
	embeddedAssets.FS = assetsFS

	cliApp := &cli.App{
		Name:    "homelab-panel",
		Usage:   "Homelab panel service",
		Version: version,
		Commands: []*cli.Command{
			{
				Name:   "serve",
				Usage:  "Start the HTTP service",
				Action: runServe,
			},
			{
				Name:   "config",
				Usage:  "Generate config.example.yaml and config.yaml",
				Action: runConfig,
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

func runServe(_ *cli.Context) error {
	err := app.InitApp()
	if err != nil {
		return fmt.Errorf("初始化错误: %w", err)
	}
	httpPort := global.Config.GetValueStringOrDefault("base", "http_port")

	if err := router.InitRouters(":" + httpPort); err != nil {
		return err
	}
	return nil
}

func runConfig(c *cli.Context) error {
	if err := appConfig.GenerateConfigFiles(); err != nil {
		return err
	}
	fmt.Fprintln(c.App.Writer, "Generated config.example.yaml and config.yaml. Existing config.yaml is preserved.")
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
	case "--config":
		normalized[1] = "config"
	case "--password-reset":
		normalized[1] = "password-reset"
	}
	return normalized
}
