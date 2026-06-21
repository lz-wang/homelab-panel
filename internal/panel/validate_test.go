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

	cases := []struct {
		name    string
		mutate  func(AppInput) AppInput
		wantSub string
	}{
		{"empty title", func(a AppInput) AppInput { a.Title = ""; return a }, "title is required"},
		{"empty url", func(a AppInput) AppInput { a.URL = ""; return a }, "url is required"},
		{"title too long", func(a AppInput) AppInput { a.Title = strings.Repeat("x", maxAppTitle+1); return a }, "title too long"},
		{"url too long", func(a AppInput) AppInput { a.URL = strings.Repeat("x", maxAppURL+1); return a }, "url too long"},
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
	if err := validateAppPatch(AppPatch{Icon: &AppIcon{Color: "#FF0000"}}); err == nil {
		t.Fatal("invalid icon color should fail")
	}
}

func TestValidateAppIcon(t *testing.T) {
	if err := validateAppIcon(AppIcon{}); err != nil {
		t.Fatalf("empty icon should pass: %v", err)
	}
	if err := validateAppIcon(AppIcon{Color: "#FFFFFF", BackgroundColor: "#2196F3"}); err != nil {
		t.Fatalf("valid colors should pass: %v", err)
	}
	if err := validateAppIcon(AppIcon{Color: "#ffffff"}); err != nil {
		t.Fatalf("lowercase color should pass: %v", err)
	}
	if err := validateAppIcon(AppIcon{Color: "#FF0000"}); err == nil {
		t.Fatal("invalid color should fail")
	}
	if err := validateAppIcon(AppIcon{BackgroundColor: "#123456"}); err == nil {
		t.Fatal("invalid background should fail")
	}
	if err := validateAppIcon(AppIcon{Text: strings.Repeat("x", maxIconText+1)}); err == nil {
		t.Fatal("too-long icon text should fail")
	}
	if err := validateAppIcon(AppIcon{Src: strings.Repeat("x", maxIconSrc+1)}); err == nil {
		t.Fatal("too-long icon src should fail")
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
