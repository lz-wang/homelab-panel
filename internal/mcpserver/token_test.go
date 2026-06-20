package mcpserver

import (
	"strings"
	"testing"
)

func TestGenerateToken(t *testing.T) {
	plain, prefix, hash, err := GenerateToken()
	if err != nil {
		t.Fatalf("GenerateToken error: %v", err)
	}

	if !strings.HasPrefix(plain, "hlpmcp_") {
		t.Errorf("token must start with hlpmcp_, got %q", plain)
	}
	if !strings.Contains(plain, ".") {
		t.Errorf("token must contain a dot separator, got %q", plain)
	}
	if plain[:len(prefix)] != prefix {
		t.Errorf("token must start with its prefix: token=%q prefix=%q", plain, prefix)
	}
	if hash == "" || len(hash) != 64 {
		t.Errorf("hash must be 64-char sha256 hex, got %q", hash)
	}
	if hash == plain {
		t.Error("hash must not equal the plaintext token")
	}
}

func TestGenerateTokenUniqueness(t *testing.T) {
	seen := make(map[string]bool, 8)
	for i := 0; i < 8; i++ {
		plain, _, _, err := GenerateToken()
		if err != nil {
			t.Fatalf("GenerateToken error: %v", err)
		}
		if seen[plain] {
			t.Fatalf("duplicate token generated: %q", plain)
		}
		seen[plain] = true
	}
}

func TestVerifyToken(t *testing.T) {
	plain, _, hash, err := GenerateToken()
	if err != nil {
		t.Fatalf("GenerateToken error: %v", err)
	}
	// 另一个 token 的真实 hash：格式合法但内容不同，必须不匹配。
	_, _, otherHash, err := GenerateToken()
	if err != nil {
		t.Fatalf("GenerateToken error: %v", err)
	}

	tests := []struct {
		name      string
		token     string
		wantHash  string
		wantValid bool
	}{
		{"correct token", plain, hash, true},
		{"wrong token", plain + "x", hash, false},
		{"empty token", "", hash, false},
		{"whitespace token", "   ", hash, false},
		{"empty expected hash", plain, "", false},
		{"different hash", plain, otherHash, false},
		{"trimmed token still valid", " " + plain + " ", hash, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := VerifyToken(tt.token, tt.wantHash); got != tt.wantValid {
				t.Errorf("VerifyToken(%q, hash) = %v, want %v", tt.token, got, tt.wantValid)
			}
		})
	}
}
