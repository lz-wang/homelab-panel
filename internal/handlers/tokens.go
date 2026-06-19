package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"time"

	"homelab-panel/internal/data"

	"github.com/golang-jwt/jwt/v5"
)

// TokenManager 以无状态 JWT(HS256) 签发/校验管理员会话。
// 撤销通过 Store 中的 token 版本号实现，不持有任何 token 状态，因此跨进程重启仍有效。
type TokenManager struct {
	store *data.Store
	ttl   time.Duration
}

func NewTokenManager(store *data.Store, ttl time.Duration) *TokenManager {
	return &TokenManager{store: store, ttl: ttl}
}

type adminClaims struct {
	Version int `json:"ver"`
	jwt.RegisteredClaims
}

// Issue 签发 HS256 JWT，claims 携带当前 token 版本号；返回 token 与过期时间。
func (m *TokenManager) Issue() (string, time.Time, error) {
	if err := m.store.EnsureSecret(); err != nil {
		return "", time.Time{}, err
	}
	now := time.Now()
	expires := now.Add(m.ttl)
	var jtiBuf [16]byte
	if _, err := rand.Read(jtiBuf[:]); err != nil {
		return "", time.Time{}, err
	}
	claims := adminClaims{
		Version: m.store.TokenVersion(),
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   "admin",
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expires),
			ID:        hex.EncodeToString(jtiBuf[:]),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(m.store.Secret()))
	if err != nil {
		return "", time.Time{}, err
	}
	return signed, expires, nil
}

// Valid 校验签名、过期与版本号是否匹配当前存储版本。
func (m *TokenManager) Valid(token string) bool {
	_, ok := m.validate(token)
	return ok
}

func (m *TokenManager) validate(token string) (adminClaims, bool) {
	secret := m.store.Secret()
	if token == "" || secret == "" {
		return adminClaims{}, false
	}
	var claims adminClaims
	parsed, err := jwt.ParseWithClaims(token, &claims, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(secret), nil
	})
	if err != nil || !parsed.Valid {
		return adminClaims{}, false
	}
	if claims.Version != m.store.TokenVersion() {
		return adminClaims{}, false
	}
	return claims, true
}

// Revoke 递增 token 版本号，使所有已签发 token 立即失效（登出/改密）。
func (m *TokenManager) Revoke() error {
	return m.store.IncrementTokenVersion()
}
