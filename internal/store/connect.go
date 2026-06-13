package store

import (
	"fmt"
	"homelab-panel/internal/app/lib/cmn"
	"homelab-panel/internal/store/models"
	"os"
	"path"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/schema"
)

const (
	SQLITE = "sqlite"
)

type DbClient interface {
	Connect() (db *gorm.DB, err error)
}

type SQLiteConfig struct {
	Filename string
}

func DbInit(dbClient DbClient) (db *gorm.DB, dbErr error) {
	db, dbErr = dbClient.Connect()
	if dbErr != nil {
		return
	}
	return
}

// Connect sqlite连接
func (d *SQLiteConfig) Connect() (db *gorm.DB, err error) {
	filePath := d.Filename
	exists := false
	if exists, err = cmn.PathExists(path.Dir(filePath)); err != nil {
		return
	} else {

		// 创建文件夹
		if !exists {
			if err = os.MkdirAll(path.Dir(filePath), 0700); err != nil {
				return
			}
		}

		db, err = gorm.Open(sqlite.Open(filePath), &gorm.Config{
			Logger: NewZapGormLogger(),
			NamingStrategy: schema.NamingStrategy{
				SingularTable: true,
			},
		})
	}

	return
}

// 创建数据库
func CreateDatabase(db *gorm.DB) error {
	// 创建数据表
	err := db.AutoMigrate(
		&models.User{},
		&models.SystemSetting{},
		&models.ItemIcon{},
		&models.UserConfig{},
		&models.File{},
		&models.ItemIconGroup{},
		&models.ModuleConfig{},
	)

	return err
}

// 初始化一个用户,一个用户都没有的时候创建一个
func NotFoundAndCreateUser(db *gorm.DB) error {
	fUser := models.User{}
	if err := db.First(&fUser).Error; err != nil {
		if err != gorm.ErrRecordNotFound {
			return err
		}
		username := "admin"
		// 随机生成初始密码并打印一次，避免硬编码弱口令 admin/admin
		password := cmn.BuildRandCode(16, cmn.RAND_CODE_MODE1)
		fUser.Mail = username
		fUser.Username = username
		fUser.Name = username
		fUser.Status = 1
		fUser.Role = 1
		fUser.Password = cmn.PasswordEncryption(password)

		if errCreate := db.Create(&fUser).Error; errCreate != nil {
			return errCreate
		}

		fmt.Printf("[init] initial admin account created.\n[init] username: %s\n[init] password: %s\n", username, password)
	}

	return nil
}
