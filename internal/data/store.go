package data

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"golang.org/x/crypto/bcrypt"
)

var ErrInvalidPassword = errors.New("invalid password")

type Store struct {
	mu   sync.RWMutex
	path string
	data StoreData
}

func Open(path string) (*Store, string, error) {
	s := &Store{path: path}

	raw, err := os.ReadFile(path)
	switch {
	case err == nil:
		if err := json.Unmarshal(raw, &s.data); err != nil {
			return nil, "", fmt.Errorf("parse store file: %w", err)
		}
		if s.data.Files == nil {
			s.data.Files = []File{}
		}
		return s, "", nil
	case errors.Is(err, os.ErrNotExist):
		password, err := s.init()
		if err != nil {
			return nil, "", err
		}
		return s, password, nil
	default:
		return nil, "", fmt.Errorf("read store file: %w", err)
	}
}

func (s *Store) init() (string, error) {
	password, err := generatePassword()
	if err != nil {
		return "", err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("hash password: %w", err)
	}
	now := time.Now()
	s.data = StoreData{
		Admin: Admin{
			PasswordHash: string(hash),
			CreatedAt:    now,
			UpdatedAt:    now,
		},
		Panel: Panel{
			SiteName:     "Homelab Panel",
			Config:       json.RawMessage("{}"),
			SearchEngine: json.RawMessage("{}"),
			Groups:       []Group{},
			Items:        []Item{},
		},
		Files:  []File{},
		NextID: NextID{Group: 1, Item: 1, File: 1},
		MCP: MCPConfig{
			Enabled: true,
			Tokens:  []MCPToken{},
		},
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := s.persist(); err != nil {
		return "", err
	}
	return password, nil
}

func (s *Store) persist() error {
	if err := os.MkdirAll(filepath.Dir(s.path), 0o755); err != nil {
		return fmt.Errorf("create data dir: %w", err)
	}
	raw, err := json.MarshalIndent(s.data, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal store: %w", err)
	}
	dir := filepath.Dir(s.path)
	tmp, err := os.CreateTemp(dir, ".homelab-panel-*.tmp")
	if err != nil {
		return fmt.Errorf("create temp file: %w", err)
	}
	tmpName := tmp.Name()
	if _, err := tmp.Write(raw); err != nil {
		tmp.Close()
		os.Remove(tmpName)
		return fmt.Errorf("write temp file: %w", err)
	}
	if err := tmp.Close(); err != nil {
		os.Remove(tmpName)
		return fmt.Errorf("close temp file: %w", err)
	}
	if err := os.Chmod(tmpName, 0o600); err != nil {
		os.Remove(tmpName)
		return fmt.Errorf("chmod temp file: %w", err)
	}
	if err := os.Rename(tmpName, s.path); err != nil {
		os.Remove(tmpName)
		return fmt.Errorf("rename store file: %w", err)
	}
	return nil
}

func (s *Store) Snapshot() StoreData {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return deepCopy(s.data)
}

func (s *Store) Save(fn func(*StoreData) error) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	next := deepCopy(s.data)
	if err := fn(&next); err != nil {
		return err
	}
	next.UpdatedAt = time.Now()
	previous := s.data
	s.data = next
	if err := s.persist(); err != nil {
		s.data = previous
		return err
	}
	return nil
}

func (s *Store) CheckPassword(password string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return bcrypt.CompareHashAndPassword([]byte(s.data.Admin.PasswordHash), []byte(password)) == nil
}

func (s *Store) UpdatePassword(oldPassword, newPassword string) error {
	if !s.CheckPassword(oldPassword) {
		return ErrInvalidPassword
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("hash password: %w", err)
	}
	return s.Save(func(d *StoreData) error {
		d.Admin.PasswordHash = string(hash)
		d.Admin.UpdatedAt = time.Now()
		return nil
	})
}

// ResetPassword 将管理员密码直接重设为 newPassword，不校验当前密码。
// 仅供 CLI reset-password 子命令在遗忘密码时恢复访问使用。
func (s *Store) ResetPassword(newPassword string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("hash password: %w", err)
	}
	return s.Save(func(d *StoreData) error {
		d.Admin.PasswordHash = string(hash)
		d.Admin.UpdatedAt = time.Now()
		return nil
	})
}

// Secret 返回 HS256 签名密钥（只读）。调用前应已通过 EnsureSecret 生成。
func (s *Store) Secret() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.data.Auth.Secret
}

// TokenVersion 返回当前 token 撤销版本号。
func (s *Store) TokenVersion() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.data.Auth.TokenVersion
}

// EnsureSecret 在密钥为空时生成 32 字节随机 hex 并持久化；已存在则原样保留（幂等）。
func (s *Store) EnsureSecret() error {
	return s.Save(func(d *StoreData) error {
		if d.Auth.Secret != "" {
			return nil
		}
		secret, err := generateSecret()
		if err != nil {
			return err
		}
		d.Auth.Secret = secret
		return nil
	})
}

// IncrementTokenVersion 递增撤销版本号，使所有已签发 token 失效（登出/改密时调用）。
func (s *Store) IncrementTokenVersion() error {
	return s.Save(func(d *StoreData) error {
		d.Auth.TokenVersion++
		return nil
	})
}

func generateSecret() (string, error) {
	var buf [32]byte
	if _, err := rand.Read(buf[:]); err != nil {
		return "", fmt.Errorf("read random: %w", err)
	}
	return hex.EncodeToString(buf[:]), nil
}

func deepCopy(d StoreData) StoreData {
	raw, err := json.Marshal(d)
	if err != nil {
		return d
	}
	var copy StoreData
	_ = json.Unmarshal(raw, &copy)
	return copy
}

// passwordAlphabet 是首启管理员密码字符集（大小写字母 + 数字，共 62）。
const (
	passwordAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
	passwordLength   = 16
)

// generatePassword 生成首启管理员密码：16 位、大小写字母 + 数字。
// 用 rejection sampling 避免模偏差；明文仅返回给调用方经 stdout 打印一次，绝不写日志。
func generatePassword() (string, error) {
	result := make([]byte, passwordLength)
	max := 256 - 256%len(passwordAlphabet) // 丢弃 >= max 的字节以保证均匀分布
	for i := 0; i < passwordLength; {
		var b [1]byte
		if _, err := rand.Read(b[:]); err != nil {
			return "", fmt.Errorf("read random: %w", err)
		}
		if int(b[0]) >= max {
			continue
		}
		result[i] = passwordAlphabet[int(b[0])%len(passwordAlphabet)]
		i++
	}
	return string(result), nil
}
