package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"sync"
	"time"
)

type TokenManager struct {
	mu     sync.Mutex
	tokens map[string]time.Time
	ttl    time.Duration
}

func NewTokenManager(ttl time.Duration) *TokenManager {
	return &TokenManager{tokens: make(map[string]time.Time), ttl: ttl}
}

func (m *TokenManager) Issue() (string, time.Time, error) {
	var buf [32]byte
	if _, err := rand.Read(buf[:]); err != nil {
		return "", time.Time{}, err
	}
	token := hex.EncodeToString(buf[:])
	expires := time.Now().Add(m.ttl)
	m.mu.Lock()
	m.tokens[token] = expires
	m.mu.Unlock()
	return token, expires, nil
}

func (m *TokenManager) Valid(token string) bool {
	if token == "" {
		return false
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	exp, ok := m.tokens[token]
	if !ok {
		return false
	}
	if time.Now().After(exp) {
		delete(m.tokens, token)
		return false
	}
	return true
}

func (m *TokenManager) Revoke(token string) {
	m.mu.Lock()
	delete(m.tokens, token)
	m.mu.Unlock()
}
