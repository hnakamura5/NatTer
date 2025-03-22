// React wrapper for xterm.js

import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { SearchAddon } from "@xterm/addon-search";
import { SerializeAddon } from "@xterm/addon-serialize";
import { ClipboardAddon } from "@xterm/addon-clipboard";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import "@xterm/xterm/css/xterm.css";

import { Box } from "@mui/system";
import styled from "@emotion/styled";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/AppState";
import { Theme } from "@/datatypes/Theme";
import { ErrorBoundary } from "react-error-boundary";
import { CommandID, ProcessID, TerminalID } from "@/datatypes/Command";
import {
  CommandHeader,
  ResponseStyle,
} from "@/components/ProcessAccordion/CommandResponseCommon";

import { api } from "@/api";

import { log } from "@/datatypes/Logger";
import { usePid } from "@/SessionStates";
import { eventStabilizer } from "../Utils";

function pxToNumber(px: string) {
  return parseInt(px.replace("px", ""));
}

type terminalHandle = {
  terminal: Terminal;
  fit: FitAddon;
  serialize: SerializeAddon;
  search: SearchAddon;
};

let count = 0;
function newTerminal(theme: Theme): terminalHandle {
  const terminal = new Terminal({
    cursorBlink: true,
    allowProposedApi: true,
    theme: {
      background: theme.shell.secondaryBackgroundColor,
      foreground: theme.shell.textColor,
    },
    fontFamily: theme.shell.font,
    fontSize: pxToNumber(theme.shell.fontSize),
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
  terminal.resize(80, 24); //[HN] TODO: set appropriate size.
  log.debug(`new terminal ${count++}`);
  return {
    terminal: terminal,
    fit: fitAddon,
    serialize: serializeAddon,
    search: searchAddon,
  };
}

interface XtermCustomProps {
  pid: TerminalID;
}

export default function XtermCustom() {
  const pid = usePid();
  const theme = useTheme();
  const termDivRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<terminalHandle | null>(null);
  const [isFinished, setIsFinished] = useState(false);

  const sendKey = api.terminal.sendKey.useMutation();
  const resize = api.terminal.resize.useMutation();
  // Bind the terminal to the DOM on the first render.
  useEffect(() => {
    const handle = newTerminal(theme);
    if (!handle) {
      log.debug(`no handle ${pid}`);
      return;
    }
    handleRef.current = handle;
    if (!termDivRef.current) {
      return;
    }
    const terminal = handle.terminal;
    const fit = handle.fit;
    log.debug(`open terminal ${pid}`);
    terminal.open(termDivRef.current);
    log.debug(
      `write terminal ${pid} area:${
        handle.terminal.textarea?.value
      } serial:${handle.serialize.serialize()}`
    );

    // Debounce the resize function to prevent multiple rapid calls
    const stableFit = eventStabilizer(() => {
      if (termDivRef.current) {
        log.debug(`resize terminal fit ${pid}`);
        fit.fit();
      }
    });
    // Initial fit
    stableFit();

    // Set up resize observer to detect container size changes
    const resizeObserver = new ResizeObserver(() => {
      if (termDivRef.current) {
        log.debug(`container resize detected for terminal ${pid}`);
        stableFit();
      }
    });

    if (termDivRef.current) {
      resizeObserver.observe(termDivRef.current);
    }
    handle.terminal.onData((data) => {
      log.debug(`terminal onData to sendKey: ${data}`);
      sendKey.mutate({ pid: pid, key: data });
    });
    handle.terminal.onResize((size) => {
      log.debug(`terminal onResize: `, size);
      resize.mutate({ pid: pid, cols: size.cols, rows: size.rows });
    });
    return () => {
      log.debug(`dispose terminal ${pid}`);
      terminal.dispose();
      resizeObserver.disconnect();
      handleRef.current = null;
    };
  }, []);

  api.terminal.stdout.useSubscription(pid, {
    onError(error) {
      log.error(`stdout: ${error}`);
    },
    onData: (data) => {
      log.debug(`stdout onData: stdout: ${data} in pid-${pid}`);
      handleRef.current?.terminal.write(data);
    },
  });

  return (
    <ErrorBoundary fallbackRender={XtermCustomError}>
      <div
        ref={termDivRef}
        id={`XtermCustom-${pid}`}
        style={{ flex: 1, overflow: "hidden" }}
      />
    </ErrorBoundary>
  );
}

function XtermCustomError() {
  return <div>Xterm.js load error.</div>;
}
