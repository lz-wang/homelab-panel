package system

import (
	"homelab-panel/internal/app/global"
	"homelab-panel/internal/app/lib/cmn"
	"homelab-panel/internal/server/api/api_v1/common/apiReturn"
	"homelab-panel/internal/server/api/api_v1/common/base"
	"homelab-panel/internal/store/models"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type LoginApi struct {
}

// 登录输入验证
type LoginLoginVerify struct {
	Username string `json:"username" validate:"required"`
	Password string `json:"password" validate:"required,max=50"`
}

// @Summary 登录账号
// @Accept application/json
// @Produce application/json
// @Param LoginLoginVerify body LoginLoginVerify true "登陆验证信息"
// @Tags user
// @Router /login [post]
func (l LoginApi) Login(c *gin.Context) {
	param := LoginLoginVerify{}
	if err := c.ShouldBindJSON(&param); err != nil {
		apiReturn.ErrorParamFomat(c, err.Error())
		return
	}

	if errMsg, err := base.ValidateInputStruct(param); err != nil {
		apiReturn.ErrorParamFomat(c, errMsg)
		return
	}

	mUser := models.User{}
	var (
		err  error
		info models.User
	)
	bToken := ""
	param.Username = strings.TrimSpace(param.Username)
	// 先按用户名查询，再校验密码（bcrypt 哈希含随机 salt，无法在 SQL 层比对）
	if info, err = mUser.GetUserInfoByUsername(param.Username); err != nil {
		// 未找到记录 账号或密码错误
		if err == gorm.ErrRecordNotFound {
			apiReturn.ErrorByCode(c, 1003)
			return
		} else {
			// 未知错误
			apiReturn.Error(c, err.Error())
			return
		}

	}

	// 校验密码（兼容 bcrypt 与旧三次 MD5 哈希）
	if !cmn.PasswordVerify(param.Password, info.Password) {
		// 账号或密码错误
		apiReturn.ErrorByCode(c, 1003)
		return
	}

	// 旧哈希迁移：校验通过后自动升级为 bcrypt
	if cmn.IsLegacyPassword(info.Password) {
		newHash := cmn.PasswordEncryption(param.Password)
		if err := mUser.UpdateUserInfoByUserId(info.ID, map[string]interface{}{
			"password": newHash,
		}); err != nil {
			apiReturn.Error(c, err.Error())
			return
		}
		info.Password = newHash
	}

	// 停用或未激活
	if info.Status != 1 {
		apiReturn.ErrorByCode(c, 1004)
		return
	}

	bToken = info.Token
	if info.Token == "" {
		// 生成 token：固定重试上限，避免极端碰撞时无上限自旋
		const maxTokenRetries = 8
		tokenOK := false
		for i := 0; i < maxTokenRetries; i++ {
			candidate := cmn.BuildRandCode(32, cmn.RAND_CODE_MODE2)
			// 仅当确认为"未找到记录"（即无碰撞）时才采用该候选 token
			if _, err := mUser.GetUserInfoByToken(candidate); err != nil {
				if err != gorm.ErrRecordNotFound {
					apiReturn.Error(c, err.Error())
					return
				}
				// 保存 token，处理写入错误（原先被丢弃）
				if err := mUser.UpdateUserInfoByUserId(info.ID, map[string]interface{}{
					"token": candidate,
				}); err != nil {
					apiReturn.Error(c, err.Error())
					return
				}
				bToken = candidate
				tokenOK = true
				break
			}
		}
		if !tokenOK {
			apiReturn.Error(c, "token generation failed after retries")
			return
		}
		info.Token = bToken
	}
	info.Password = "" // 即使已 json:"-"，仍清空避免在上下文中携带哈希
	info.ReferralCode = ""

	cToken := uuid.NewString() + "-" + cmn.Md5(cmn.Md5("userId"+strconv.Itoa(int(info.ID))))
	global.CUserToken.SetDefault(cToken, bToken)
	global.Logger.Debug("token:", cToken, "|", bToken)
	global.Logger.Debug(global.CUserToken.Get(cToken))

	// 设置当前用户信息（上下文内传递，不经过 JSON 序列化）
	info.Token = cToken // 重要 采用cToken,隐藏真实token
	c.Set("userInfo", info)
	// 登录响应显式返回会话 token（cToken），model 上的 Password/Token 已 json:"-"
	apiReturn.SuccessData(c, gin.H{
		"id":         info.ID,
		"userId":     info.ID,
		"username":   info.Username,
		"name":       info.Name,
		"headImage":  info.HeadImage,
		"status":     info.Status,
		"role":       info.Role,
		"mail":       info.Mail,
		"createTime": info.CreatedAt,
		"updateTime": info.UpdatedAt,
		"token":      cToken,
	})
}

// 安全退出
// @Summary Logout
// @Tags user
// @Produce json
// @Security ApiTokenAuth
// @Success 200 {object} apiReturn.Response
// @Router /logout [post]
func (l *LoginApi) Logout(c *gin.Context) {
	cToken := c.GetHeader("token")
	global.CUserToken.Delete(cToken)
	apiReturn.Success(c)
}
