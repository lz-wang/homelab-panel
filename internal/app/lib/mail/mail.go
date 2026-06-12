package mail

import (
	"homelab-panel/internal/app/global"
)

// 发送注册验证码
//
// 参数: emailer, mailTo 收件人, vcode 验证码.
// 返回: error.
func SendRegisterEmail(emailer *Emailer, mailTo, vcode string) error {
	appName := "Homelab Panel"
	title := appName + " - 注册验证码"
	content := "感谢注册" + appName + "，您的验证码将在10分钟后过期。"
	err := emailer.SendMailOfVCode(mailTo, title, content, vcode)
	if err != nil {
		global.Logger.Errorf("failed to send email to %s, err:%+v\n", mailTo, err)
	}
	return err
}

// 发送重置密码验证码
//
// 参数: emailer, mailTo, vcode.
// 返回: error.
func SendResetPasswordVCode(emailer *Emailer, mailTo, vcode string) error {
	title := "Homelab Panel - 重置密码"
	content := "您正在重置密码，请使用以下验证码完成操作。"
	err := emailer.SendMailOfVCode(mailTo, title, content, vcode)
	if err != nil {
		global.Logger.Errorf("failed to send email to %s, err:%+v\n", mailTo, err)
	}
	return err
}
