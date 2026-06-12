package lang

import (
	"homelab-panel/internal/app/global"
	"homelab-panel/internal/app/lib/cmn"
	"homelab-panel/internal/app/lib/language"
	"os"
)

func LangInit() {
	filename := "lang/zh-cn.ini"
	exists, err := cmn.PathExists(filename)
	if err != nil {
		global.Logger.Errorln("语言文件不存在", err.Error())
		os.Exit(1)
	}

	// 生成语言文件
	if !exists {
		global.Logger.Infoln("输出语言文件:", filename)
		err := cmn.AssetsTakeFileToPath("lang/zh-cn.ini", "lang/zh-cn.ini")
		if err != nil {
			global.Logger.Errorln("输出语言文件出错:", err.Error())
			os.Exit(1)
		}
	}
	exists, err = cmn.PathExists(filename)
	if err != nil || !exists {
		global.Logger.Errorln("语言文件不存在:", filename)
		os.Exit(1)
	}

	global.Lang = language.NewLang(filename)
}
