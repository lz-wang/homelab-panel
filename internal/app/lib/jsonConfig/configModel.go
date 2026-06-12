package jsonConfig

import (
	"encoding/json"

	"github.com/gin-gonic/gin"
)

type JsonConfiger interface {
	GetImportData() error
	// ExportFile()
}

type ConfigModel struct {
	AppName            string      `json:"AppName"`
	Ability            string      `json:"Ability"`
	Version            string      `json:"Version"`
	AbilityVersion     string      `json:"AbilityVersion"`
	AppAllowLowVersion string      `json:"AppAllowLowVersion"`
	Data               interface{} `json:"Data"`
}

var expoprtSuffix = ".lcn.json"

const (
	ABILITY_MODE_EVENT_STYLE = "EventStyle" // 时间风格
	ABILITY_MODE_SPECIAL_DAY = "SpecialDay" // 特殊的日期
)

// 生成输出文件
func BuildExportFile(cfgModel *ConfigModel) ([]byte, error) {
	content, err := json.Marshal(cfgModel)
	return content, err
}

func Write(ctx *gin.Context, fileName string, content []byte) {
	ctx.Writer.Header().Add("Content-Type", "application/octet-stream")
	ctx.Writer.Header().Add("Content-disposition", "attachment;filename="+fileName+expoprtSuffix)
	ctx.Writer.Header().Add("Content-Transfer-Encoding", "binary")
	ctx.Writer.Write(content)
}

func GetImportData(JsonConfiger) {

}

func NewConfigModel(ability, abilityVersion string) *ConfigModel {
	return &ConfigModel{
		AppName:            "Li-Calendar",
		Version:            "1",
		AppAllowLowVersion: "1",
		Ability:            ability,
		AbilityVersion:     abilityVersion,
	}
}

// 验证配置模型数据是否相同
func ConfigModelCheck(data *ConfigModel, ability, abilityVersion string) bool {
	newData := NewConfigModel(ability, abilityVersion)
	if *data != *newData {
		return false
	}
	return true
}

