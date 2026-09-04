package panel

import (
	"strings"
	"testing"
)

func strPtr(s string) *string { return &s }
func intPtr(i int) *int       { return &i }

func TestValidateAppInput(t *testing.T) {
	base := AppInput{Title: "t", URL: "u", Icon: AppIcon{}}
	if err := validateAppInput(base); err != nil {
		t.Fatalf("valid input should pass: %v", err)
	}

	// 可选 backup_url：空通过，合法值通过。
	if err := validateAppInput(AppInput{Title: "t", URL: "u", BackupURL: "https://b", Icon: AppIcon{}}); err != nil {
		t.Fatalf("optional backup_url should pass: %v", err)
	}

	cases := []struct {
		name    string
		mutate  func(AppInput) AppInput
		wantSub string
	}{
		{"empty title", func(a AppInput) AppInput { a.Title = ""; return a }, "title is required"},
		{"empty url", func(a AppInput) AppInput { a.URL = ""; return a }, "url is required"},
		{"title too long", func(a AppInput) AppInput { a.Title = strings.Repeat("x", maxAppTitle+1); return a }, "title too long"},
		{"url too long", func(a AppInput) AppInput { a.URL = strings.Repeat("x", maxAppURL+1); return a }, "url too long"},
		{"backup_url too long", func(a AppInput) AppInput { a.BackupURL = strings.Repeat("x", maxAppURL+1); return a }, "backup_url too long"},
		{"description too long", func(a AppInput) AppInput { a.Description = strings.Repeat("x", maxDescription+1); return a }, "description too long"},
		{"negative sort", func(a AppInput) AppInput { a.Sort = -1; return a }, "sort must be non-negative"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			err := validateAppInput(c.mutate(base))
			if err == nil || !strings.Contains(err.Error(), c.wantSub) {
				t.Fatalf("got %v, want containing %q", err, c.wantSub)
			}
		})
	}
}

func TestValidateAppPatch(t *testing.T) {
	if err := validateAppPatch(AppPatch{}); err != nil {
		t.Fatalf("empty patch should pass: %v", err)
	}
	if err := validateAppPatch(AppPatch{Title: strPtr("")}); err == nil {
		t.Fatal("empty title should fail")
	}
	if err := validateAppPatch(AppPatch{URL: strPtr("")}); err == nil {
		t.Fatal("empty url should fail")
	}
	if err := validateAppPatch(AppPatch{Title: strPtr("t"), URL: strPtr("u")}); err != nil {
		t.Fatalf("valid patch should pass: %v", err)
	}
	if err := validateAppPatch(AppPatch{Title: strPtr(strings.Repeat("x", maxAppTitle+1))}); err == nil {
		t.Fatal("too-long title should fail")
	}
	if err := validateAppPatch(AppPatch{Description: strPtr(strings.Repeat("x", maxDescription+1))}); err == nil {
		t.Fatal("too-long description should fail")
	}
	if err := validateAppPatch(AppPatch{Sort: intPtr(-1)}); err == nil {
		t.Fatal("negative sort should fail")
	}
	if err := validateAppPatch(AppPatch{Icon: &AppIcon{Text: "mdi:home", Color: "#FF0000"}}); err == nil {
		t.Fatal("invalid icon color should fail")
	}
	// backup_url：缺省不改、空串清空（均合法），超长报错。
	if err := validateAppPatch(AppPatch{BackupURL: strPtr("")}); err != nil {
		t.Fatalf("empty backup_url (clear) should pass: %v", err)
	}
	if err := validateAppPatch(AppPatch{BackupURL: strPtr("https://b")}); err != nil {
		t.Fatalf("valid backup_url should pass: %v", err)
	}
	if err := validateAppPatch(AppPatch{BackupURL: strPtr(strings.Repeat("x", maxAppURL+1))}); err == nil {
		t.Fatal("too-long backup_url should fail")
	}
}

func TestValidateAppIcon(t *testing.T) {
	if err := ValidateAppIcon(AppIcon{}); err != nil {
		t.Fatalf("empty icon should pass: %v", err)
	}
	valid := AppIcon{Text: "mdi:home", Color: "#FFFFFF", BackgroundColor: "#2196F3"}
	if err := ValidateAppIcon(valid); err != nil {
		t.Fatalf("valid iconify icon should pass: %v", err)
	}
	if err := ValidateAppIcon(AppIcon{Text: "mdi:home", Color: "#ffffff"}); err != nil {
		t.Fatalf("lowercase color should pass: %v", err)
	}

	// 非零图标必须有 text（Iconify identifier）。
	if err := ValidateAppIcon(AppIcon{Color: "#FFFFFF"}); err == nil {
		t.Fatal("icon without text should fail")
	}
	if err := ValidateAppIcon(AppIcon{Text: "  "}); err == nil {
		t.Fatal("blank icon text should fail")
	}
	// text 必须是 prefix:name 形式的 Iconify identifier。
	if err := ValidateAppIcon(AppIcon{Text: "plain-text"}); err == nil {
		t.Fatal("text without prefix:name shape should fail")
	}
	if err := ValidateAppIcon(AppIcon{Text: ":home"}); err == nil {
		t.Fatal("empty prefix should fail")
	}
	if err := ValidateAppIcon(AppIcon{Text: "mdi:"}); err == nil {
		t.Fatal("empty name should fail")
	}

	if err := ValidateAppIcon(AppIcon{Text: "mdi:home", Color: "#FF0000"}); err == nil {
		t.Fatal("invalid color should fail")
	}
	if err := ValidateAppIcon(AppIcon{Text: "mdi:home", BackgroundColor: "#123456"}); err == nil {
		t.Fatal("invalid background should fail")
	}
	if err := ValidateAppIcon(AppIcon{Text: "mdi:" + strings.Repeat("x", maxIconText)}); err == nil {
		t.Fatal("too-long icon text should fail")
	}
}

func TestValidateSearchPattern(t *testing.T) {
	if err := validateSearchPattern("ok"); err != nil {
		t.Fatalf("short pattern should pass: %v", err)
	}
	if err := validateSearchPattern(strings.Repeat("x", maxPatternLen+1)); err == nil {
		t.Fatal("too-long pattern should fail")
	}
}

func TestNormalizeSearchLimit(t *testing.T) {
	if got := normalizeSearchLimit(0); got != defaultLimit {
		t.Errorf("0 → %d, want %d", got, defaultLimit)
	}
	if got := normalizeSearchLimit(-5); got != defaultLimit {
		t.Errorf("-5 → %d, want %d", got, defaultLimit)
	}
	if got := normalizeSearchLimit(maxLimit + 10); got != maxLimit {
		t.Errorf("over max → %d, want %d", got, maxLimit)
	}
	if got := normalizeSearchLimit(50); got != 50 {
		t.Errorf("in-range → %d, want 50", got)
	}
}

func TestValidateGroupInput(t *testing.T) {
	if err := validateGroupInput(GroupInput{Name: "g"}); err != nil {
		t.Fatalf("valid group should pass: %v", err)
	}
	if err := validateGroupInput(GroupInput{Name: ""}); err == nil {
		t.Fatal("empty name should fail")
	}
	if err := validateGroupInput(GroupInput{Name: "g", Sort: -1}); err == nil {
		t.Fatal("negative sort should fail")
	}
}

func TestValidateGroupPatch(t *testing.T) {
	if err := validateGroupPatch(GroupPatch{}); err != nil {
		t.Fatalf("empty patch should pass: %v", err)
	}
	if err := validateGroupPatch(GroupPatch{Name: strPtr("")}); err == nil {
		t.Fatal("empty name should fail")
	}
	if err := validateGroupPatch(GroupPatch{Icon: strPtr("")}); err != nil {
		t.Fatalf("clear icon should pass: %v", err)
	}
	if err := validateGroupPatch(GroupPatch{Sort: intPtr(-1)}); err == nil {
		t.Fatal("negative sort should fail")
	}
}
