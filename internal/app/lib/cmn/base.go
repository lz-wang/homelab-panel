package cmn

import (
	"crypto/md5"
	"crypto/rand"
	"encoding/hex"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

const (
	// 时间格式

	TimeFormatMode1         = "2006-01-02 15:04:05" // 标准格式
	TimeFormatMode4         = "2006-01-02 15:04"    // 标准格式 无秒
	TimeFormatMode2         = "Mon Jan 2 15:04:05 -0700 MST 2006"
	TimeFormatMode3         = "Mon, 2 Jan 2006 15:04:05 -0700 MST" // webdav格式
	TimeYYYY_mm_dd          = "2006-01-02"
	TIME_MODE_REMINDER_TIME = "200601021504" // 提醒定时器的执行时间格式

	// 随机码字典

	RAND_CODE_MODE1 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789" // 大写，小写，数字
	RAND_CODE_MODE2 = "abcdefghijklmnopqrstuvwxyz0123456789"                           // 小写，数字
	RAND_CODE_MODE3 = "0123456789"                                                     // 数字
)

func GetTime() string {
	return time.Unix(time.Now().Unix(), 0).Format(TimeFormatMode1)
}

// 字符串转时间
func StrToTime(timeMode, formatTimeStr string) (t time.Time, err error) {
	loc, err := time.LoadLocation("Local")
	if err != nil {
		return
	}
	t, err = time.ParseInLocation(timeMode, formatTimeStr, loc) //使用模板在对应时区转化为time.time类型
	return
}

// md5获取
func Md5(str string) string {
	md5Byte := md5.Sum([]byte(str))
	return hex.EncodeToString(md5Byte[:])
}

// 随机生成编码
// 使用 crypto/rand 生成密码学安全的随机码，用于 token / 推荐码等敏感场景
// 随机码字典内容 参考常量 RAND_CODE_MODE*
func BuildRandCode(count int, secret_content string) (code string) {
	if secret_content == "" {
		secret_content = RAND_CODE_MODE1
	}
	dictLen := len(secret_content)
	buf := make([]byte, count)
	if _, err := rand.Read(buf); err != nil {
		// crypto/rand 读取失败极其罕见（通常是系统熵池异常），无法安全降级，直接 panic
		panic("crypto/rand read failed: " + err.Error())
	}
	for i := 0; i < count; i++ {
		code += string(secret_content[int(buf[i])%dictLen])
	}
	return code
}

func InSlice(items []string, item string) bool {
	for _, eachItem := range items {
		if eachItem == item {
			return true
		}
	}
	return false
}

// 字符串转int
func StrToInt(str string) int {
	intStr, _ := strconv.Atoi(str)
	return intStr
}

// uint 转string
func UintToStr(c uint) string {
	return strconv.FormatUint(uint64(c), 10)
}

// uint 转string
func StrToUint(s string) uint {
	// i, _ := strconv.Atoi(s)
	u, _ := strconv.ParseUint(s, 10, 64)
	return uint(u)
}

// 文件是否存在
func PathExists(path string) (bool, error) {

	_, err := os.Stat(path)
	if err == nil {
		return true, nil
	}
	if os.IsNotExist(err) {
		return false, nil
	}
	return false, err
}

// 截取字符串，支持多字节字符
// start：起始下标，负数从从尾部开始，最后一个为-1
// length：截取长度，负数表示截取到末尾
func SubRuneStr(str string, start int, length int) (result string) {
	s := []rune(str)
	total := len(s)
	if total == 0 {
		return
	}
	// 允许从尾部开始计算
	if start < 0 {
		start = total + start
		if start < 0 {
			return
		}
	}
	if start > total {
		return
	}
	// 到末尾
	if length < 0 {
		length = total
	}

	end := start + length
	if end > total {
		result = string(s[start:])
	} else {
		result = string(s[start:end])
	}

	return
}

// 字符串长度
func RuneStrLen(str string) int {
	return len([]rune(str))
}

// 是否在数组中
func InStringArray(arr []string, item string) bool {
	for _, v := range arr {
		if v == item {
			return true
		}
	}
	return false
}

func InArray[T uint | int | int8 | int64 | float32 | float64 | string](arr []T, item T) bool {
	sort.Slice(arr, func(i, j int) bool {
		return arr[i] < arr[j]
	})

	index := sort.Search(len(arr), func(i int) bool {
		return arr[i] >= item
	})

	return index < len(arr) && arr[index] == item
}

// 密码加密（使用 bcrypt，含随机 salt）
func PasswordEncryption(password string) string {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		// 仅在密码超过 72 字节时失败，业务层已做长度校验，此处防御性处理
		panic("bcrypt hash failed: " + err.Error())
	}
	return string(hash)
}

// IsLegacyPassword 判断是否为旧的三次 MD5（无 salt）哈希，用于登录时迁移升级。
// bcrypt 哈希以 "$2" 开头且长度为 60，旧 MD5 哈希固定为 32 位十六进制。
func IsLegacyPassword(hash string) bool {
	return len(hash) == 32 && !strings.HasPrefix(hash, "$2")
}

// legacyPasswordEncryption 复现旧的三次 MD5 哈希，仅用于迁移期校验旧密码。
func legacyPasswordEncryption(password string) string {
	return Md5(Md5(Md5(password)))
}

// PasswordVerify 校验明文密码与存储哈希是否匹配，兼容 bcrypt 与旧三次 MD5 哈希。
func PasswordVerify(password, hash string) bool {
	if IsLegacyPassword(hash) {
		return legacyPasswordEncryption(password) == hash
	}
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}
