
import { AnsiUp } from "ansi-up";

// The original implementation of ansi_up.js does not escape the space.
// We fix this by force overriding the doEscape method.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(AnsiUp.prototype as any).doEscape = function (txt: any) {
  return txt.replace(/[ &<>]/gm, function (str: string) {
    if (str === " ") return "&nbsp;";
    if (str === "&") return "&amp;";
    if (str === "<") return "&lt;";
    if (str === ">") return "&gt;";
  });
};

export { AnsiUp };
