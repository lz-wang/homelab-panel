package cmn

import "testing"

func TestPasswordEncryptionIsBcrypt(t *testing.T) {
	hash := PasswordEncryption("secret")
	if !startsWith(hash, "$2") {
		t.Fatalf("expected bcrypt hash starting with $2, got %q", hash)
	}
	if len(hash) != 60 {
		t.Fatalf("expected 60-byte bcrypt hash, got len=%d", len(hash))
	}
	// bcrypt 含随机 salt，同一明文两次哈希结果应不同
	if PasswordEncryption("secret") == hash {
		t.Fatal("bcrypt hash should differ on each call due to random salt")
	}
}

func TestPasswordVerifyBcrypt(t *testing.T) {
	hash := PasswordEncryption("p@ssw0rd")
	if !PasswordVerify("p@ssw0rd", hash) {
		t.Fatal("correct password should verify")
	}
	if PasswordVerify("wrong", hash) {
		t.Fatal("wrong password should not verify")
	}
}

func TestPasswordVerifyLegacyMigration(t *testing.T) {
	// 旧的三次 MD5 哈希（无 salt），用于验证迁移路径
	legacy := Md5(Md5(Md5("oldpass")))
	if !IsLegacyPassword(legacy) {
		t.Fatal("triple-MD5 hash should be detected as legacy")
	}
	if IsLegacyPassword(PasswordEncryption("x")) {
		t.Fatal("bcrypt hash should not be detected as legacy")
	}
	// 旧哈希仍可校验通过
	if !PasswordVerify("oldpass", legacy) {
		t.Fatal("legacy hash should verify with correct password")
	}
	if PasswordVerify("other", legacy) {
		t.Fatal("legacy hash should reject wrong password")
	}
}

func startsWith(s, prefix string) bool {
	return len(s) >= len(prefix) && s[:len(prefix)] == prefix
}
