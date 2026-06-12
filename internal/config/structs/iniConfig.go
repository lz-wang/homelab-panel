package structs

// 配置文件redis
type IniConfigRedis struct {
	Address  string `ini:"address" mapstructure:"address"`   // 地址：localhost:6379
	Password string `ini:"password" mapstructure:"password"` // 密码
	Prefix   string `ini:"prefix" mapstructure:"prefix"`     // key前缀
	Db       int    `ini:"db" mapstructure:"db"`             // 数据库，默认0
}
