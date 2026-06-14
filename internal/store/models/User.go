package models

import (
	"errors"

	"gorm.io/gorm"
)

// 用户表
type User struct {
	BaseModel
	Username     string `gorm:"index:;index:idx_username_password,priority:1;type:varchar(50)" json:"username" validate:"required"` // 账号
	Password     string `gorm:"index:idx_username_password;type:varchar(255)" json:"-" validate:"required"`                         // 密码
	Name         string `gorm:"type:varchar(20)" json:"name"`                                                                       // 名称
	Status       int    `gorm:"type:tinyint(1)" json:"status"`                                                                      // 状态 1.启用 2.停用 3.未激活
	Role         int    `gorm:"type:int(11)" json:"role"`                                                                           // 角色 1.管理员 2.普通用户
	Mail         string `gorm:"type:varchar(50)" json:"mail"`                                                                       // 邮箱
	ReferralCode string `gorm:"type:varchar(10)" json:"referralCode"`                                                               // 推荐码
	Token        string `gorm:"type:varchar(32)" json:"-"`

	UserId uint `gorm:"-"  json:"userId"`
}

// 获取用户信息
func (m *User) GetUserInfoByUid(db *gorm.DB, uid uint) (User, error) {
	mUser := User{}
	err := db.Where("id=?", uid).First(&mUser).Error
	return mUser, err
}

// 根据用户名查询用户
func (m *User) GetUserInfoByUsername(db *gorm.DB, username string) (User, error) {
	mUser := User{}
	err := db.Where("username=?", username).First(&mUser).Error
	return mUser, err
}

// 根据token查询用户
func (m *User) GetUserInfoByToken(db *gorm.DB, userToken string) (User, error) {
	mUser := User{}
	err := db.Where("token=?", userToken).First(&mUser).Error
	return mUser, err
}

// 更新用户基于id
// 支持：name,autograph,status,role,mail,token,password,username,gender
func (m *User) UpdateUserInfoByUserId(db *gorm.DB, user_id uint, updateInfo map[string]interface{}) error {
	mUser := User{}

	data := map[string]interface{}{}
	if v, ok := updateInfo["name"]; ok {
		data["name"] = v
	}
	if v, ok := updateInfo["status"]; ok {
		data["status"] = v
	}
	if v, ok := updateInfo["role"]; ok {
		data["role"] = v
	}
	if v, ok := updateInfo["gender"]; ok {
		data["gender"] = v
	}

	if v, ok := updateInfo["mail"]; ok {
		hasUser := User{}
		count := db.Where("mail=?", updateInfo["mail"]).First(&hasUser).RowsAffected
		if count != 0 && hasUser.ID != user_id {
			return errors.New("the mail already exists")
		}
		data["mail"] = v
	}
	if v, ok := updateInfo["username"]; ok {
		hasUser := User{}
		count := db.Where("username=?", updateInfo["username"]).First(&hasUser).RowsAffected
		if count != 0 && hasUser.ID != user_id {
			return errors.New("the username already exists")
		}
		data["username"] = v
	}
	if v, ok := updateInfo["token"]; ok {
		data["token"] = v
	}
	if v, ok := updateInfo["password"]; ok {
		data["password"] = v
	}

	err := db.Model(&mUser).Where("id=?", user_id).Updates(data).Error

	return err
}

// 添加一个
func (m *User) CreateOne(db *gorm.DB) (User, error) {
	err := db.Create(m).Error
	return *m, err
}

// 验证是否有重复的用户名或者邮箱
func (m *User) CheckUsernameExist(db *gorm.DB, username string) (User, error) {
	hasUser := User{}
	count := db.Where("username=?", username).First(&hasUser).RowsAffected
	if count != 0 {
		return hasUser, errors.New("该用户名已被注册")
	}
	return hasUser, nil
}
