# Security Notes

## Footer HTML

`panel.footerHtml` is intentionally rendered as trusted HTML on the home page. It is an administrator-only customization surface and must not be exposed to untrusted users without adding sanitization or replacing it with a safer format such as Markdown or plain text.

## Item URLs

Frontend URL handling only accepts `http:` and `https:` item URLs. Other schemes such as `javascript:`, `data:`, and `file:` are rejected before saving.
