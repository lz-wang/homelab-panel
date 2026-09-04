package panel

import (
	"context"
	"encoding/json"
	"reflect"
	"testing"
)

func TestDecodePanelConfigPreservesDefaultsAndExplicitValues(t *testing.T) {
	tests := []struct {
		name string
		raw  string
		want PanelConfig
	}{
		{name: "empty object", raw: `{}`, want: defaultPanelConfig()},
		{name: "partial object", raw: `{"logo_text":"My Lab"}`, want: func() PanelConfig { cfg := defaultPanelConfig(); cfg.LogoText = "My Lab"; return cfg }()},
		{name: "explicit false", raw: `{"clock_show":false}`, want: func() PanelConfig { cfg := defaultPanelConfig(); cfg.ClockShow = false; return cfg }()},
		{name: "explicit zero", raw: `{"margin_top":0}`, want: func() PanelConfig { cfg := defaultPanelConfig(); cfg.MarginTop = 0; return cfg }()},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := DecodePanelConfig(json.RawMessage(tt.raw))
			if err != nil {
				t.Fatalf("DecodePanelConfig(%s): %v", tt.raw, err)
			}
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("DecodePanelConfig(%s) = %+v, want %+v", tt.raw, got, tt.want)
			}
		})
	}
}

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
	for _, tc := range []struct {
		name string
		set  func(*PanelConfig)
	}{
		{name: "blur above web maximum", set: func(c *PanelConfig) { c.BackgroundBlur = 20.1 }},
		{name: "mask above web maximum", set: func(c *PanelConfig) { c.BackgroundMaskNumber = 1.01 }},
	} {
		t.Run(tc.name, func(t *testing.T) {
			cfg := defaultPanelConfig()
			tc.set(&cfg)
			if err := ValidatePanelConfig(cfg); err == nil {
				t.Error("out-of-range config should fail")
			}
		})
	}
}
