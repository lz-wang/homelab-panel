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

	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
)

const dataVersion = 2

var ErrInvalidPassword = errors.New("invalid password")

type Store struct {
	mu     sync.RWMutex
	path   string
	data   StoreData
	logger *zap.Logger
}

func Open(path string, logger *zap.Logger) (*Store, string, error) {
	s := &Store{path: path, logger: logger}

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
		Version: dataVersion,
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
		Files:     []File{},
		NextID:    NextID{Group: 1, Item: 1, File: 1},
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

func deepCopy(d StoreData) StoreData {
	raw, err := json.Marshal(d)
	if err != nil {
		return d
	}
	var copy StoreData
	_ = json.Unmarshal(raw, &copy)
	return copy
}

func generatePassword() (string, error) {
	var buf [12]byte
	if _, err := rand.Read(buf[:]); err != nil {
		return "", fmt.Errorf("read random: %w", err)
	}
	return hex.EncodeToString(buf[:]), nil
}
