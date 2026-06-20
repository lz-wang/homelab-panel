package mcpserver

import (
	"strings"
	"testing"
	"time"
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

func TestRateLimiter(t *testing.T) {
	rl := NewRateLimiter(3, time.Minute)
	key := "principal|1.2.3.4"

	for i := 1; i <= 3; i++ {
		if !rl.Allow(key) {
			t.Fatalf("call %d should be allowed", i)
		}
	}
	if rl.Allow(key) {
		t.Error("4th call within window should be rejected")
	}

	// 不同 key 互不影响。
	if !rl.Allow("other|5.6.7.8") {
		t.Error("different key should be independent")
	}
}
