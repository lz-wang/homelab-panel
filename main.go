package main

import (
	"embed"
	"errors"
	"fmt"
	"io/fs"
	"log"
	"os"
	"path/filepath"

	"homelab-panel/internal/app"
	"homelab-panel/internal/data"
	"homelab-panel/internal/logging"

	"github.com/urfave/cli/v2"
	"golang.org/x/term"
)

//go:embed web/dist/*
var webFS embed.FS

//go:embed go.mod
var goModContent string

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
			{
				Name:  "reset-password",
				Usage: "Reset the admin password and write it to the local JSON store",
				Flags: []cli.Flag{
					&cli.StringFlag{
						Name:    "dir",
						Aliases: []string{"d"},
						Usage:   "Data directory (contains homelab-panel.json)",
						Value:   "./data",
					},
					&cli.StringFlag{
						Name:    "password",
						Aliases: []string{"p"},
						Usage:   "New password (omit to be prompted interactively)",
					},
				},
				Action: runResetPassword,
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
		GoMod:   goModContent,
	}

	// 与 app.Config.dataDir() 一致：空值兜底 ./data，确保日志与 store 落在同一目录。
	dataDir := cfg.DataDir
	if dataDir == "" {
		dataDir = "./data"
	}
	logging.Init(dataDir)

	return app.Run(c.Context, cfg)
}

func runVersion(c *cli.Context) error {
	c.App.Writer.Write([]byte(version + "\n"))
	return nil
}

func runResetPassword(c *cli.Context) error {
	dataDir := c.String("dir")
	if dataDir == "" {
		dataDir = "./data"
	}

	defer func() { _ = logging.Sync() }()

	// store 路径与 app.New 保持一致：<dataDir>/homelab-panel.json
	storePath := filepath.Join(dataDir, "homelab-panel.json")
	store, createdPassword, err := data.Open(storePath)
	if err != nil {
		return fmt.Errorf("open store: %w", err)
	}
	if createdPassword != "" {
		// Open 返回非空密码说明数据文件原本不存在（或版本不兼容被重置），
		// 提示用户确认 --dir 指向正确的目录，避免在错误目录下误建空存储。
		fmt.Fprintln(os.Stderr, "Note: the data file did not exist or was reset; a new store has been created. Make sure --dir points to the correct data directory.")
	}

	newPassword, err := readNewPassword(c.String("password"))
	if err != nil {
		return err
	}
	if err := store.ResetPassword(newPassword); err != nil {
		return fmt.Errorf("reset password: %w", err)
	}
	logging.Infof("admin password reset via CLI")
	fmt.Println("Admin password reset.")
	return nil
}

const minPasswordLength = 6

// readNewPassword 解析新密码：提供了 prefilled 则直接使用，否则在交互式终端
// 掩码输入并要求二次确认。非交互式环境必须提供 prefilled。
func readNewPassword(prefilled string) (string, error) {
	if prefilled != "" {
		if len(prefilled) < minPasswordLength {
			return "", fmt.Errorf("password must be at least %d characters", minPasswordLength)
		}
		return prefilled, nil
	}

	fd := int(os.Stdin.Fd())
	if !term.IsTerminal(fd) {
		return "", errors.New("non-interactive environment: provide the new password via --password")
	}

	fmt.Print("Enter new password (at least 6 characters): ")
	pw, err := term.ReadPassword(fd)
	fmt.Println()
	if err != nil {
		return "", fmt.Errorf("read password: %w", err)
	}

	fmt.Print("Confirm new password: ")
	confirm, err := term.ReadPassword(fd)
	fmt.Println()
	if err != nil {
		return "", fmt.Errorf("read password: %w", err)
	}

	if string(pw) != string(confirm) {
		return "", errors.New("passwords do not match")
	}
	if len(pw) < minPasswordLength {
		return "", fmt.Errorf("password must be at least %d characters", minPasswordLength)
	}
	return string(pw), nil
}
