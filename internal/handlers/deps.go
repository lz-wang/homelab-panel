package handlers

import (
	"bufio"
	"strings"
)

// aboutDep 是 /about 返回的第三方库条目：name 为展示名，url 为 GitHub 仓库地址。
type aboutDep struct {
	Name string `json:"name"`
	URL  string `json:"url"`
}

// aboutAuthor 是 /about 返回的作者信息。
type aboutAuthor struct {
	Name string `json:"name"`
	URL  string `json:"url"`
}

// parseGoModDeps 解析 go.mod 内容，返回直接依赖（排除 // indirect）及其 GitHub 仓库。
// 仅返回能映射到 GitHub 的依赖；无法确定仓库地址的条目被跳过。
func parseGoModDeps(goMod string) []aboutDep {
	var deps []aboutDep
	seen := make(map[string]bool)
	inRequire := false

	scanner := bufio.NewScanner(strings.NewReader(goMod))
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())

		// 进入/离开 require 块。
		if line == "require (" {
			inRequire = true
			continue
		}
		if inRequire && line == ")" {
			inRequire = false
			continue
		}

		// 仅处理 require 块内行，或单行 require。
		isSingle := strings.HasPrefix(line, "require ")
		if !inRequire && !isSingle {
			continue
		}
		candidate := line
		if isSingle {
			candidate = strings.TrimSpace(strings.TrimPrefix(line, "require "))
			if candidate == "" {
				continue
			}
		}

		// 排除间接依赖，去行内注释。
		if strings.Contains(candidate, "// indirect") {
			continue
		}
		if i := strings.Index(candidate, "//"); i >= 0 {
			candidate = strings.TrimSpace(candidate[:i])
		}

		fields := strings.Fields(candidate)
		if len(fields) < 1 {
			continue
		}
		path := fields[0]
		if seen[path] {
			continue
		}

		name, url, ok := depGitHubURL(path)
		if !ok {
			continue
		}
		seen[path] = true
		deps = append(deps, aboutDep{Name: name, URL: url})
	}

	return deps
}

// depGitHubURL 把 Go import path 映射到 GitHub 仓库，返回 (展示名, url, ok)。
// 覆盖 github.com / golang.org/x / gopkg.in 的 owner/repo 形式，以及 go.uber.org 等特例。
func depGitHubURL(path string) (name, url string, ok bool) {
	switch path {
	case "go.uber.org/zap":
		return "uber-go/zap", "https://github.com/uber-go/zap", true
	}

	switch {
	case strings.HasPrefix(path, "github.com/"):
		parts := strings.Split(strings.TrimPrefix(path, "github.com/"), "/")
		if len(parts) >= 2 {
			name := parts[0] + "/" + parts[1]
			return name, "https://github.com/" + name, true
		}
	case strings.HasPrefix(path, "golang.org/x/"):
		sub := strings.TrimPrefix(path, "golang.org/x/")
		name := "golang/" + sub
		return name, "https://github.com/" + name, true
	case strings.HasPrefix(path, "gopkg.in/"):
		rest := strings.TrimPrefix(path, "gopkg.in/")
		if idx := strings.Index(rest, "/"); idx > 0 {
			owner := rest[:idx]
			repo := strings.Split(rest[idx+1:], ".")[0]
			name := owner + "/" + repo
			return name, "https://github.com/" + name, true
		}
	}
	return "", "", false
}
