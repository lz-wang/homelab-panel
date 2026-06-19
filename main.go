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

	"github.com/urfave/cli/v2"
	"go.uber.org/zap"
	"golang.org/x/term"
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
	}
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

	logger, err := zap.NewProduction()
	if err != nil {
		return fmt.Errorf("create logger: %w", err)
	}
	defer func() { _ = logger.Sync() }()

	// store 路径与 app.New 保持一致：<dataDir>/homelab-panel.json
	storePath := filepath.Join(dataDir, "homelab-panel.json")
	store, createdPassword, err := data.Open(storePath, logger)
	if err != nil {
		return fmt.Errorf("open store: %w", err)
	}
	if createdPassword != "" {
		// Open 返回非空密码说明数据文件原本不存在（或版本不兼容被重置），
		// 提示用户确认 --dir 指向正确的目录，避免在错误目录下误建空存储。
		fmt.Fprintln(os.Stderr, "注意：数据文件不存在或已重置，已创建新的存储。请确认 --dir 指向正确的数据目录。")
	}

	newPassword, err := readNewPassword(c.String("password"))
	if err != nil {
		return err
	}
	if err := store.ResetPassword(newPassword); err != nil {
		return fmt.Errorf("reset password: %w", err)
	}
	fmt.Println("管理员密码已重置。")
	return nil
}

const minPasswordLength = 6

// readNewPassword 解析新密码：提供了 prefilled 则直接使用，否则在交互式终端
// 掩码输入并要求二次确认。非交互式环境必须提供 prefilled。
func readNewPassword(prefilled string) (string, error) {
	if prefilled != "" {
		if len(prefilled) < minPasswordLength {
			return "", fmt.Errorf("密码至少需要 %d 个字符", minPasswordLength)
		}
		return prefilled, nil
	}

	fd := int(os.Stdin.Fd())
	if !term.IsTerminal(fd) {
		return "", errors.New("非交互式环境：请使用 --password 参数指定新密码")
	}

	fmt.Print("请输入新密码（至少 6 个字符）：")
	pw, err := term.ReadPassword(fd)
	fmt.Println()
	if err != nil {
		return "", fmt.Errorf("read password: %w", err)
	}

	fmt.Print("请再次输入新密码：")
	confirm, err := term.ReadPassword(fd)
	fmt.Println()
	if err != nil {
		return "", fmt.Errorf("read password: %w", err)
	}

	if string(pw) != string(confirm) {
		return "", errors.New("两次输入的密码不一致")
	}
	if len(pw) < minPasswordLength {
		return "", fmt.Errorf("密码至少需要 %d 个字符", minPasswordLength)
	}
	return string(pw), nil
}
