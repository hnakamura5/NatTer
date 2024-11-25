import { AnsiUp } from "ansi_up";

// The original implementation of ansi_up.js does not escape the space to &nbsp.
// We fix this by force overriding the doEscape method.

// For ver 1.2
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(AnsiUp.prototype as any).doEscape = function (txt: any) {
  return txt.replace(/[ &<>]/gm, function (str: string) {
    if (str === " ") return "&nbsp;";
    if (str === "&") return "&amp;";
    if (str === "<") return "&lt;";
    if (str === ">") return "&gt;";
  });
};

// For newer version.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(AnsiUp.prototype as any).escape_txt_for_html = function (txt: string) {
  if (!this._escape_html) return txt;
  return txt.replace(/[ &<>"']/gm, (str: string) => {
    if (str === " ") return "&nbsp;";
    if (str === "&") return "&amp;";
    if (str === "<") return "&lt;";
    if (str === ">") return "&gt;";
    if (str === '"') return "&quot;";
    if (str === "'") return "&#x27;";
    return "";
  });
};

export { AnsiUp };
