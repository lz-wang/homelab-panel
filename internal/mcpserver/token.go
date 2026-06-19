package mcpserver

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"strings"
)

// tokenPrefixLen 控制 token 前缀中随机 hex 的字节数（展示用，不泄露 secret）。
const tokenPrefixLen = 4

// tokenSecretLen 是 token 秘密部分的随机字节数。
const tokenSecretLen = 32

// GenerateToken 生成一个新的 MCP bearer token。
//
// 格式：hlpmcp_<prefix>.<secret>
//   - prefix：4 字节随机 hex，落盘展示给用户辨认（如 hlpmcp_a1b2c3d4）
//   - secret：32 字节随机 base64url
//
// 返回明文 token、可展示前缀与 sha256 摘要。明文只返回一次，存储仅保留前缀与摘要。
func GenerateToken() (plain string, prefix string, hash string, err error) {
	prefixBytes := make([]byte, tokenPrefixLen)
	secretBytes := make([]byte, tokenSecretLen)

	if _, err = rand.Read(prefixBytes); err != nil {
		return "", "", "", fmt.Errorf("read token prefix: %w", err)
	}
	if _, err = rand.Read(secretBytes); err != nil {
		return "", "", "", fmt.Errorf("read token secret: %w", err)
	}

	prefix = "hlpmcp_" + hex.EncodeToString(prefixBytes)
	secret := base64.RawURLEncoding.EncodeToString(secretBytes)

	plain = prefix + "." + secret
	hash = HashToken(plain)
	return plain, prefix, hash, nil
}

// HashToken 返回 token 的 sha256 hex 摘要，用于落盘比对。
func HashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

// VerifyToken 以常量时间比对 token 的摘要与期望摘要。
func VerifyToken(token string, expectedHash string) bool {
	token = strings.TrimSpace(token)
	if token == "" || expectedHash == "" {
		return false
	}
	actual := HashToken(token)
	return subtle.ConstantTimeCompare([]byte(actual), []byte(expectedHash)) == 1
}
