package logging

import (
	"bytes"
	"regexp"
	"strings"
	"testing"

	"go.uber.org/zap/zapcore"
)

func TestNewLoggerPlainTextLine(t *testing.T) {
	var buf bytes.Buffer
	logger := newLogger(zapcore.AddSync(&buf))

	logger.Info("starting server on :3002")
	logger.Error("save panel failed: boom")
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
