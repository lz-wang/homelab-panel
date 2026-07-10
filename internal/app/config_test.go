package app

import "testing"

func TestConfigAddress(t *testing.T) {
	cases := []struct {
		port string
		want string
	}{
		{"", ":9090"},
		{"8080", ":8080"},
	}
	for _, c := range cases {
		if got := (Config{Port: c.port}).address(); got != c.want {
			t.Errorf("port=%q address=%q, want %q", c.port, got, c.want)
		}
	}
}

func TestConfigDataDir(t *testing.T) {
	if got := (Config{}).dataDir(); got != "./data" {
		t.Errorf("empty DataDir=%q, want ./data", got)
	}
	if got := (Config{DataDir: "/tmp/x"}).dataDir(); got != "/tmp/x" {
		t.Errorf("DataDir=%q, want /tmp/x", got)
	}
}
