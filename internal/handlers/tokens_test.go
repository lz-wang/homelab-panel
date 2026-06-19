package handlers

import (
	"encoding/base64"
	"encoding/json"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"homelab-panel/internal/data"
)

func newTokenTestStore(t *testing.T) *data.Store {
	t.Helper()
	s, _, err := data.Open(filepath.Join(t.TempDir(), "homelab-panel.json"))
	if err != nil {
		t.Fatalf("open store: %v", err)
	}
	if err := s.EnsureSecret(); err != nil {
		t.Fatalf("ensure secret: %v", err)
	}
	return s
}

func TestTokenIssueAndValidate(t *testing.T) {
	m := NewTokenManager(newTokenTestStore(t), time.Hour)
	token, _, err := m.Issue()
	if err != nil {
		t.Fatalf("issue: %v", err)
	}
	if token == "" || !m.Valid(token) {
		t.Fatal("issued token should be valid")
	}
	// 应为可解析的 JWT，而非 opaque 字符串
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		t.Fatalf("token should be a 3-part JWT, got %d parts", len(parts))
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		t.Fatalf("decode payload: %v", err)
	}
	var claim adminClaims
	if err := json.Unmarshal(payload, &claim); err != nil {
		t.Fatalf("payload should be valid JSON claims: %v", err)
	}
	if claim.Subject != "admin" {
		t.Fatalf("expected subject=admin, got %q", claim.Subject)
	}
}

func TestTokenExpiredInvalid(t *testing.T) {
	m := NewTokenManager(newTokenTestStore(t), 1*time.Millisecond)
	token, _, _ := m.Issue()
	time.Sleep(20 * time.Millisecond)
	if m.Valid(token) {
		t.Fatal("expired token should be invalid")
	}
}

func TestTokenTamperedInvalid(t *testing.T) {
	m := NewTokenManager(newTokenTestStore(t), time.Hour)
	token, _, _ := m.Issue()
	// 篡改末位字符，破坏签名
	tail := token[len(token)-1:]
	if tail == "A" {
		token = token[:len(token)-1] + "B"
	} else {
		token = token[:len(token)-1] + "A"
	}
	if m.Valid(token) {
		t.Fatal("tampered token should be invalid")
	}
}

func TestTokenEmptyInvalid(t *testing.T) {
	m := NewTokenManager(newTokenTestStore(t), time.Hour)
	if m.Valid("") {
		t.Fatal("empty token should be invalid")
	}
}

func TestRevokeInvalidatesIssued(t *testing.T) {
	store := newTokenTestStore(t)
	m := NewTokenManager(store, time.Hour)
	token, _, _ := m.Issue()
	if !m.Valid(token) {
		t.Fatal("token should be valid before revoke")
	}
	if err := m.Revoke(); err != nil {
		t.Fatalf("revoke: %v", err)
	}
	if m.Valid(token) {
		t.Fatal("revoked token should be invalid")
	}
	// 版本号已递增：重签的新 token 可用，旧 token 仍失效
	token2, _, _ := m.Issue()
	if !m.Valid(token2) {
		t.Fatal("new token after revoke should be valid")
	}
	if m.Valid(token) {
		t.Fatal("old token should remain invalid after re-issue")
	}
}
