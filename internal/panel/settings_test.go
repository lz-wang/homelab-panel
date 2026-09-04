package panel

import (
	"context"
	"testing"
)

func TestPanelSettingsPatch(t *testing.T) {
	svc := NewService(seedStore(t))
	clock, radius, name := false, 24.0, "Lab"
	settings, err := svc.PatchSettings(context.Background(), PanelSettingsPatch{SiteName: &name, ClockShow: &clock, AppCardRadius: &radius})
	if err != nil {
		t.Fatalf("PatchSettings: %v", err)
	}
	if settings.SiteName != name || settings.Config.ClockShow || settings.Config.AppCardRadius != radius {
		t.Errorf("settings = %+v", settings)
	}
	bad := "bad"
	if _, err := svc.PatchSettings(context.Background(), PanelSettingsPatch{AppCardAspectRatio: &bad}); err == nil {
		t.Error("invalid aspect ratio should fail")
	}
}

func TestPanelConfigValidation(t *testing.T) {
	cfg := defaultPanelConfig()
	if err := ValidatePanelConfig(cfg); err != nil {
		t.Fatalf("default config: %v", err)
	}
	cfg.FaviconSrc = "javascript:alert(1)"
	if err := ValidatePanelConfig(cfg); err == nil {
		t.Error("unsafe favicon should fail")
	}
}
