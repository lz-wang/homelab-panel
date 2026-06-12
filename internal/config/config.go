package config

import (
	"errors"
	"fmt"
	"homelab-panel/internal/webui/assets"
	"os"
	"path/filepath"
	"strings"

	"github.com/spf13/viper"
)

const (
	ConfigFileName        = "config.yaml"
	ConfigExampleFileName = "config.example.yaml"
	DotEnvFileName        = ".env"
)

const defaultConfigYAML = `base:
  http_port: "3002"
  source_path: ./uploads
  source_temp_path: ./runtime/temp

sqlite:
  file_path: ./data.db
`

var configKeys = []string{
	"base.http_port",
	"base.source_path",
	"base.source_temp_path",
	"sqlite.file_path",
}

type Config struct {
	v        *viper.Viper
	fileName string
}

func ConfigInit() (*Config, error) {
	return Load(".")
}

func Load(configPath string) (*Config, error) {
	if configPath == "" {
		configPath = "."
	}

	v := viper.New()
	setDefaults(v)

	v.SetConfigName(strings.TrimSuffix(ConfigFileName, filepath.Ext(ConfigFileName)))
	v.SetConfigType("yaml")
	v.AddConfigPath(configPath)

	if err := v.ReadInConfig(); err != nil {
		var notFound viper.ConfigFileNotFoundError
		if !errors.As(err, &notFound) {
			return nil, err
		}
	}

	if err := mergeDotEnv(v, filepath.Join(configPath, DotEnvFileName)); err != nil {
		return nil, err
	}

	bindEnv(v)

	return &Config{
		v:        v,
		fileName: v.ConfigFileUsed(),
	}, nil
}

func GenerateConfigFiles() error {
	if err := writeDefaultConfigFile(ConfigExampleFileName, true); err != nil {
		return err
	}
	return writeDefaultConfigFile(ConfigFileName, false)
}

func (c *Config) GetValueString(section string, name string) string {
	if c == nil || c.v == nil {
		return ""
	}
	return c.v.GetString(configKey(section, name))
}

func (c *Config) GetValueStringOrDefault(section string, name string) string {
	return c.GetValueString(section, name)
}

func (c *Config) GetValueInt(section string, name string) int {
	if c == nil || c.v == nil {
		return 0
	}
	return c.v.GetInt(configKey(section, name))
}

func (c *Config) GetSection(section string, result interface{}) error {
	if c == nil || c.v == nil {
		return errors.New("config is not initialized")
	}
	return c.v.UnmarshalKey(section, result)
}

func (c *Config) SetValue(section string, name string, value string) error {
	if c == nil || c.v == nil {
		return errors.New("config is not initialized")
	}

	c.v.Set(configKey(section, name), value)
	if c.fileName == "" {
		c.fileName = ConfigFileName
		return c.v.WriteConfigAs(c.fileName)
	}
	return c.v.WriteConfig()
}

func setDefaults(v *viper.Viper) {
	v.SetDefault("base.http_port", "3002")
	v.SetDefault("base.source_path", "./uploads")
	v.SetDefault("base.source_temp_path", "./runtime/temp")
	v.SetDefault("sqlite.file_path", "./data.db")
}

func bindEnv(v *viper.Viper) {
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()

	for _, key := range configKeys {
		envKey := strings.ToUpper(strings.ReplaceAll(key, ".", "_"))
		_ = v.BindEnv(key, envKey, "HOMELAB_PANEL_"+envKey)
	}
}

func mergeDotEnv(v *viper.Viper, envFile string) error {
	if _, err := os.Stat(envFile); err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}

	env := viper.New()
	env.SetConfigFile(envFile)
	env.SetConfigType("env")
	if err := env.ReadInConfig(); err != nil {
		return err
	}

	for _, key := range env.AllKeys() {
		if mappedKey, ok := mapEnvKey(key); ok {
			v.Set(mappedKey, env.Get(key))
		}
	}
	return nil
}

func mapEnvKey(key string) (string, bool) {
	normalized := strings.ToLower(strings.TrimSpace(key))
	normalized = strings.TrimPrefix(normalized, "homelab_panel_")
	normalized = strings.ReplaceAll(normalized, "__", ".")

	if strings.Contains(normalized, ".") {
		for _, key := range configKeys {
			if normalized == key {
				return key, true
			}
		}
	}

	switch normalized {
	case "http_port", "base_http_port":
		return "base.http_port", true
	case "source_path", "base_source_path":
		return "base.source_path", true
	case "source_temp_path", "base_source_temp_path":
		return "base.source_temp_path", true
	case "sqlite_file_path", "database_path", "sqlite_path":
		return "sqlite.file_path", true
	default:
		return "", false
	}
}

func configKey(section string, name string) string {
	return section + "." + name
}

func writeDefaultConfigFile(targetPath string, overwrite bool) error {
	if !overwrite {
		if _, err := os.Stat(targetPath); err == nil {
			return nil
		} else if !os.IsNotExist(err) {
			return err
		}
	}

	content, err := assets.Asset(ConfigExampleFileName)
	if err != nil {
		content = []byte(defaultConfigYAML)
	}

	if err := os.WriteFile(targetPath, content, 0644); err != nil {
		return fmt.Errorf("write %s: %w", targetPath, err)
	}
	return nil
}
