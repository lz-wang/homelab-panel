package handlers

import (
	"testing"
	"time"
)

func TestTokenIssueValidRevoke(t *testing.T) {
	m := NewTokenManager(time.Hour)

	token, _, err := m.Issue()
	if err != nil {
		t.Fatalf("issue: %v", err)
	}
	if token == "" || !m.Valid(token) {
		t.Fatal("issued token should be valid")
	}
	m.Revoke(token)
	if m.Valid(token) {
		t.Fatal("revoked token should be invalid")
	}
}

func TestTokenExpiredInvalid(t *testing.T) {
	m := NewTokenManager(10 * time.Millisecond)
	token, _, _ := m.Issue()
	time.Sleep(20 * time.Millisecond)
	if m.Valid(token) {
		t.Fatal("expired token should be invalid")
	}
}

func TestTokenEmptyInvalid(t *testing.T) {
	m := NewTokenManager(time.Hour)
	if m.Valid("") {
		t.Fatal("empty token should be invalid")
	}
}
