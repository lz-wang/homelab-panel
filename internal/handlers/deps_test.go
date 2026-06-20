package handlers

import "testing"

func TestParseGoModDeps(t *testing.T) {
	goMod := `module homelab-panel

go 1.26

require (
	github.com/gin-gonic/gin v1.12.0
	github.com/modelcontextprotocol/go-sdk v1.6.1
	go.uber.org/zap v1.28.0
	golang.org/x/crypto v0.53.0
	gopkg.in/natefinch/lumberjack.v2 v2.2.1
)

require (
	github.com/bytedance/sonic v1.15.2 // indirect
	golang.org/x/net v0.56.0 // indirect
)
`
	deps := parseGoModDeps(goMod)
	if len(deps) != 5 {
		t.Fatalf("deps count = %d, want 5: %+v", len(deps), deps)
	}

	want := map[string]string{
		"gin-gonic/gin":               "https://github.com/gin-gonic/gin",
		"modelcontextprotocol/go-sdk": "https://github.com/modelcontextprotocol/go-sdk",
		"uber-go/zap":                 "https://github.com/uber-go/zap",
		"golang/crypto":               "https://github.com/golang/crypto",
		"natefinch/lumberjack":        "https://github.com/natefinch/lumberjack",
	}
	got := make(map[string]string, len(deps))
	for _, d := range deps {
		got[d.Name] = d.URL
	}
	for name, url := range want {
		if got[name] != url {
			t.Errorf("dep %s = %q, want %q", name, got[name], url)
		}
	}

	// indirect 必须被排除。
	for _, d := range deps {
		if d.Name == "bytedance/sonic" || d.Name == "golang/net" {
			t.Errorf("indirect dep leaked: %+v", d)
		}
	}
}

func TestDepGitHubURL(t *testing.T) {
	tests := []struct {
		path    string
		wantOK  bool
		wantURL string
	}{
		{"github.com/gin-gonic/gin", true, "https://github.com/gin-gonic/gin"},
		{"github.com/urfave/cli/v2", true, "https://github.com/urfave/cli"},
		{"go.uber.org/zap", true, "https://github.com/uber-go/zap"},
		{"golang.org/x/term", true, "https://github.com/golang/term"},
		{"gopkg.in/natefinch/lumberjack.v2", true, "https://github.com/natefinch/lumberjack"},
		{"example.com/unknown", false, ""},
	}
	for _, tt := range tests {
		name, url, ok := depGitHubURL(tt.path)
		if ok != tt.wantOK {
			t.Errorf("depGitHubURL(%q) ok = %v, want %v", tt.path, ok, tt.wantOK)
			continue
		}
		if ok && url != tt.wantURL {
			t.Errorf("depGitHubURL(%q) url = %q, want %q (name=%s)", tt.path, url, tt.wantURL, name)
		}
	}
}
