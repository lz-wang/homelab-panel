package logging

import (
	"bytes"
	"regexp"
	"strings"
	"testing"

	"go.uber.org/zap/zapcore"
)

func TestSugaredLoggerPlainTextLine(t *testing.T) {
	var buf bytes.Buffer
	logger := newSugared(zapcore.AddSync(&buf))

	logger.Infof("starting server on %s", ":3002")
	logger.Errorf("save panel failed: %s", "boom")
	_ = logger.Sync()

	out := buf.String()
	lines := strings.Split(strings.TrimRight(out, "\n"), "\n")
	if len(lines) != 2 {
		t.Fatalf("expected 2 log lines, got %d: %q", len(lines), out)
	}

	// 整体格式：时间(19) 空格 级别(大写) 空格 message
	lineRe := regexp.MustCompile(`^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} [A-Z]+ .+$`)
	for i, l := range lines {
		if !lineRe.MatchString(l) {
			t.Errorf("line %d does not match plain-text format: %q", i, l)
		}
	}

	// 级别固定 6 字符宽：INFO(4) 与 ERROR(5) 的消息起始列号必须一致。
	infoMsgIdx := strings.Index(lines[0], "starting server")
	errorMsgIdx := strings.Index(lines[1], "save panel failed")
	if infoMsgIdx != errorMsgIdx {
		t.Errorf("level alignment broken: INFO msg at col %d, ERROR msg at col %d\nINFO:  %q\nERROR: %q",
			infoMsgIdx, errorMsgIdx, lines[0], lines[1])
	}
	const expectedMsgCol = 19 + 1 + 6 + 1 // "YYYY-MM-DD HH:MM:SS" + " " + level(6) + " "
	if infoMsgIdx != expectedMsgCol {
		t.Errorf("message column = %d, want %d (level not padded to 6?)\n%q",
			infoMsgIdx, expectedMsgCol, lines[0])
	}

	// 非 JSON：不应出现字段对象大括号。
	if strings.ContainsAny(out, "{}") {
		t.Errorf("log output contains JSON object braces, expected plain text: %q", out)
	}
}

func TestPackageFunctionsUseGlobal(t *testing.T) {
	// 包级函数应通过全局 sugar 正常工作（默认实例非 nil，不显式 Init 也能记日志）。
	// 这里只验证不 panic 且返回的 Sync 无错。
	AssertNotPanic(t)
}

// AssertNotPanic 调用各包级日志函数，确保全局 logger 已就绪、不会 nil panic。
func AssertNotPanic(t *testing.T) {
	t.Helper()
	defer func() {
		if r := recover(); r != nil {
			t.Fatalf("package-level log function panicked: %v", r)
		}
	}()
	Debugf("debug %d", 1)
	Infof("info %d", 1)
	Warnf("warn %d", 1)
	Errorf("error %d", 1)
	Debug("debug", "msg")
	Info("info", "msg")
	Warn("warn", "msg")
	Error("error", "msg")
}
