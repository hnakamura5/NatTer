import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { SearchAddon } from "@xterm/addon-search";
import { SerializeAddon } from "@xterm/addon-serialize";
import { ClipboardAddon } from "@xterm/addon-clipboard";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import "@xterm/xterm/css/xterm.css";

import { useEffect, useRef } from "react";
import { Theme } from "@/datatypes/Theme";
import { useTheme } from "@/AppState";
import { CommandID, ProcessID, TerminalID } from "@/datatypes/Command";

import { log } from "@/datatypes/Logger";

let count = 0;

function newTerminal(theme: Theme) {
  const terminal = new Terminal({
    theme: {
      background: theme.shell.secondaryBackgroundColor,
      foreground: theme.shell.textColor,
    },
    fontFamily: theme.shell.font,
    allowProposedApi: true,
  });
  const fitAddon = new FitAddon();
  const serializeAddon = new SerializeAddon();
  const searchAddon = new SearchAddon();
  terminal.loadAddon(fitAddon);
  terminal.loadAddon(serializeAddon);
  terminal.loadAddon(searchAddon);
  terminal.loadAddon(new WebLinksAddon());
  terminal.loadAddon(new ClipboardAddon());
  terminal.loadAddon(new Unicode11Addon());
  terminal.unicode.activeVersion = "11";
  terminal.resize(512, 64); // TODO: set appropriate size?
  log.debug(`new terminal handle ${count++}`);
  return {
    terminal: terminal,
    fit: fitAddon,
    serialize: serializeAddon,
    search: searchAddon,
  };
}

interface XtermProps {
  pid: TerminalID;
}

export default function Xterm(props: XtermProps) {
  const pid = props.pid;
  const theme = useTheme();
  const termDivRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<{ terminal: Terminal; opened: boolean } | null>(
    null
  );

  useEffect(() => {
    const handle = newTerminal(theme);
    if (!handle) {
      log.debug(`no handle ${pid}`);
      return;
    }
    const terminal = handle.terminal;
    if (termDivRef.current) {
      terminal.open(termDivRef.current);
      log.debug(`open terminal ${pid}`);
    }
    //handle.fit.fit();

    terminal.write(`pid: ${pid}\r\n`); // TODO: to test

    return () => {
      log.debug(`dispose terminal ${pid}`);
      terminal.dispose();
    };
  }, []);

  return <div ref={termDivRef} id={`Xterm-${pid}`} />;
}
