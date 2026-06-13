package panel

import (
	"errors"
	"homelab-panel/internal/app/global"
	"homelab-panel/internal/app/lib/cmn"
	"homelab-panel/internal/app/lib/cmn/systemSetting"
	"homelab-panel/internal/server/api/api_v1/common/apiReturn"
	"homelab-panel/internal/server/api/api_v1/common/base"
	"homelab-panel/internal/store/models"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/gin-gonic/gin/binding"
	"gorm.io/gorm"
)

// 此API 临时使用，后期带有管理功能，将废除！！！
type UsersApi struct {
}

var (
	ErrUsersApiAtLeastKeepOne = errors.New("at least keep one")
)

func (a UsersApi) Create(c *gin.Context) {
	param := models.User{}
	if err := c.ShouldBindBodyWith(&param, binding.JSON); err != nil {
		apiReturn.ErrorParamFomat(c, err.Error())
		return
	}

	if errMsg, err := base.ValidateInputStruct(param); err != nil {
		apiReturn.ErrorParamFomat(c, errMsg)
		return
	}

	param.Username = strings.TrimSpace(param.Username)
	if len(param.Username) < 5 {
		apiReturn.ErrorParamFomat(c, "The account must be no less than 5 characters long")
		return
	}

	mUser := models.User{
		Username:  strings.TrimSpace(param.Username),
		Password:  cmn.PasswordEncryption(param.Password),
		Name:      param.Name,
		HeadImage: param.HeadImage,
		Status:    1,
		Role:      param.Role,
	}

	// 验证账号是否存在
	if _, err := mUser.CheckUsernameExist(global.Db, param.Username); err != nil {
		apiReturn.ErrorByCode(c, 1006)
		return
	}

	userInfo, err := mUser.CreateOne(global.Db)

	if err != nil {
		apiReturn.ErrorDatabase(c, err.Error())
		return
	}

	apiReturn.SuccessData(c, gin.H{"userId": userInfo.ID})
}

func (a UsersApi) Deletes(c *gin.Context) {
	type UserIds struct {
		UserIds []uint
	}
	param := UserIds{}
	if err := c.ShouldBindBodyWith(&param, binding.JSON); err != nil {
		apiReturn.ErrorParamFomat(c, err.Error())
		c.Abort()
		return
	}

	txErr := global.Db.Transaction(func(tx *gorm.DB) error {
		mitemIconGroup := models.ItemIconGroup{}

		for _, v := range param.UserIds {
			// 删除图标
			if err := tx.Delete(&models.ItemIcon{}, "user_id=?", v).Error; err != nil {
				return err
			}
			// 删除分组
			if err := mitemIconGroup.DeleteByUserId(tx, v); err != nil {
				return err
			}
			// 删除模块配置
			if err := tx.Delete(&models.ModuleConfig{}, "user_id=?", v).Error; err != nil {
				return err
			}
			// 删除用户配置
			if err := tx.Delete(&models.ModuleConfig{}, "user_id=?", v).Error; err != nil {
				return err
			}
		}

		if err := tx.Delete(&models.User{}, &param.UserIds).Error; err != nil {
			apiReturn.ErrorDatabase(c, err.Error())
			return err
		}

		// 验证是否还存在管理员
		var count int64
		if err := tx.Model(&models.User{}).Where("role=?", 1).Count(&count).Error; err != nil {
			return err
		} else if count == 0 {
			return ErrUsersApiAtLeastKeepOne
		}

		return nil
	})
	if txErr == ErrUsersApiAtLeastKeepOne {
		apiReturn.ErrorByCode(c, 1201)
		return
	} else if txErr != nil {
		apiReturn.ErrorDatabase(c, txErr.Error())
		return
	}

	apiReturn.Success(c)
}

func (a UsersApi) Update(c *gin.Context) {
	param := models.User{}
	if err := c.ShouldBindBodyWith(&param, binding.JSON); err != nil {
		apiReturn.ErrorParamFomat(c, err.Error())
		c.Abort()
		return
	}

	if param.Password == "" {
		param.Password = "-" // 修改不允许修改密码，为了验证通过
	}

	if errMsg, err := base.ValidateInputStruct(param); err != nil {
		apiReturn.ErrorParamFomat(c, errMsg)
		return
	}

	param.Username = strings.Trim(param.Username, " ")
	if len(param.Username) < 3 {
		// 账号不得少于3个字符
		apiReturn.ErrorParamFomat(c, "The account must be no less than 3 characters long")
		return
	}

	allowField := []string{"Username", "Name", "Mail", "Token", "Role"}

	// 密码不为默认"-"空，修改密码
	if param.Password != "-" {
		param.Password = cmn.PasswordEncryption(param.Password)
		allowField = append(allowField, "Password")
	}

	mUser := models.User{}

	userInfo := models.User{}
	// 验证账号是否存在
	if user, err := mUser.CheckUsernameExist(global.Db, param.Username); err != nil {
		userInfo = user
		if user.ID != param.ID {
			apiReturn.ErrorByCode(c, 1006)
			return
		}
	} else {
		userInfo = user
	}

	param.Token = "" // 修改资料就重置token
	if err := global.Db.Select(allowField).Where("id=?", param.ID).Updates(&param).Error; err != nil {
		apiReturn.ErrorDatabase(c, err.Error())
		return
	}
	global.UserToken.Delete(userInfo.Token) // 更新用户信息
	// 返回token等基本信息
	apiReturn.SuccessData(c, param)
}

func (a UsersApi) GetList(c *gin.Context) {

	type ParamsStruct struct {
		models.User
		Limit   int
		Page    int
		Keyword string `json:"keyword"`
	}

	param := ParamsStruct{}
	if err := c.ShouldBindBodyWith(&param, binding.JSON); err != nil {
		apiReturn.ErrorParamFomat(c, err.Error())
		c.Abort()
		return
	}

	var (
		list  []models.User
		count int64
	)
	db := global.Db

	// 查询条件
	if param.Keyword != "" {
		db = db.Where("name LIKE ? OR username LIKE ?", "%"+param.Keyword+"%", "%"+param.Keyword+"%")
	}

	if err := db.Omit("Password").Limit(param.Limit).Offset((param.Page - 1) * param.Limit).Find(&list).Limit(-1).Offset(-1).Count(&count).Error; err != nil {
		apiReturn.ErrorDatabase(c, err.Error())
		return
	}

	apiReturn.SuccessListData(c, list, count)
}

func (a UsersApi) SetPublicVisitUser(c *gin.Context) {
	type Req struct {
		UserId *uint `json:"userId"`
	}

	req := Req{}
	if err := c.ShouldBindBodyWith(&req, binding.JSON); err != nil {
		apiReturn.ErrorParamFomat(c, err.Error())
		return
	}

	if req.UserId != nil {
		userInfo := models.User{}
		if err := global.Db.First(&userInfo, "id=?", req.UserId).Error; err != nil {
			global.Logger.Warnf("查询用户失败: %v", err)
			apiReturn.ErrorDataNotFound(c)
			return
		}
	}

	if err := global.SystemSetting.Set(systemSetting.PANEL_PUBLIC_USER_ID, req.UserId); err != nil {
		apiReturn.Error(c, "set fail")
		return
	}
	apiReturn.Success(c)
}

func (a UsersApi) GetPublicVisitUser(c *gin.Context) {
	var userId *uint
	if err := global.SystemSetting.GetValueByInterface(systemSetting.PANEL_PUBLIC_USER_ID, &userId); err == nil && userId != nil {
		userInfo := models.User{}
		if err := global.Db.First(&userInfo, "id=?", userId).Error; err == nil {
			apiReturn.SuccessData(c, userInfo)
			return
		}
	}

	// 没有此配置
	apiReturn.ErrorDataNotFound(c)
}
