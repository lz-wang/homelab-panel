package data

import (
	"errors"
	"fmt"

	"github.com/glebarez/sqlite"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func OpenSQLite(path string) (*gorm.DB, error) {
	db, err := gorm.Open(sqlite.Open(path), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("open sqlite database: %w", err)
	}
	return db, nil
}

func AutoMigrate(db *gorm.DB) error {
	if err := db.AutoMigrate(
		&User{},
		&Session{},
		&Group{},
		&Item{},
		&UserConfig{},
		&AppSetting{},
		&File{},
	); err != nil {
		return fmt.Errorf("auto migrate database: %w", err)
	}
	return nil
}

func SeedDefaultData(db *gorm.DB) error {
	user, created, err := seedDefaultAdmin(db)
	if err != nil {
		return err
	}
	if created {
		fmt.Println("default admin created: username=admin password=admin")
		fmt.Println("please change the password after login")
	}

	if err := seedAppSetting(db, user.ID); err != nil {
		return err
	}
	if err := seedUserConfig(db, user.ID); err != nil {
		return err
	}
	return nil
}

func seedDefaultAdmin(db *gorm.DB) (*User, bool, error) {
	var user User
	err := db.Where("username = ?", "admin").First(&user).Error
	if err == nil {
		return &user, false, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, false, fmt.Errorf("load default admin: %w", err)
	}

	hash, err := bcrypt.GenerateFromPassword([]byte("admin"), bcrypt.DefaultCost)
	if err != nil {
		return nil, false, fmt.Errorf("hash default admin password: %w", err)
	}

	user = User{
		Username:     "admin",
		PasswordHash: string(hash),
		Name:         "管理员",
		Role:         "admin",
		Status:       "active",
	}
	if err := db.Create(&user).Error; err != nil {
		return nil, false, fmt.Errorf("create default admin: %w", err)
	}
	return &user, true, nil
}

func seedAppSetting(db *gorm.DB, publicUserID uint) error {
	var setting AppSetting
	err := db.First(&setting, 1).Error
	if err == nil {
		return nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return fmt.Errorf("load app setting: %w", err)
	}

	setting = AppSetting{
		BaseModel:    BaseModel{ID: 1},
		SiteName:     "Homelab Panel",
		PublicUserID: publicUserID,
	}
	if err := db.Create(&setting).Error; err != nil {
		return fmt.Errorf("create app setting: %w", err)
	}
	return nil
}

func seedUserConfig(db *gorm.DB, userID uint) error {
	var count int64
	if err := db.Model(&UserConfig{}).Where("user_id = ?", userID).Count(&count).Error; err != nil {
		return fmt.Errorf("count user config: %w", err)
	}
	if count > 0 {
		return nil
	}

	config := UserConfig{
		UserID:       userID,
		Panel:        "{}",
		SearchEngine: "{}",
	}
	if err := db.Create(&config).Error; err != nil {
		return fmt.Errorf("create user config: %w", err)
	}
	return nil
}
