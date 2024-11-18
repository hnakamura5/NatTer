// React wrapper for xterm.js

import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { SearchAddon } from "@xterm/addon-search";
import { SerializeAddon } from "@xterm/addon-serialize";
import { ClipboardAddon } from "@xterm/addon-clipboard";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import { logger } from "@/datatypes/Logger";
import { useTheme } from "@/AppState";
import { api } from "@/api";
import { ErrorBoundary } from "react-error-boundary";
import { Theme } from "@/datatypes/Theme";

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
      background: theme.terminal.backgroundColor,
      foreground: theme.terminal.textColor,
    },
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
  terminal.resize(80, 24);
  console.log(`new terminal ${count++}`);
  return {
    terminal: terminal,
    fit: fitAddon,
    serialize: serializeAddon,
    search: searchAddon,
  };
}
const xtermMap = new Map<string, terminalHandle>();
function getTerminal(pid: number, cid: number, theme: Theme): terminalHandle {
  const key = `Xterm-${pid}-${cid}`;
  console.log(`get terminal ${key}`);
  let handle = xtermMap.get(key);
  if (!handle) {
    handle = newTerminal(theme);
    xtermMap.set(key, handle);
  }
  return handle;
}
function disposeTerminal(pid: number, cid: number) {
  const key = `Xterm-${pid}-${cid}`;
  const handle = xtermMap.get(key);
  if (handle) {
    handle.terminal.dispose();
    xtermMap.delete(key);
  }
}

interface XtermCustomProps {
  pid: number;
  cid: number;
}
export default function XtermCustom(props: XtermCustomProps) {
  const pid = props.pid;
  const cid = props.cid;
  const theme = useTheme();
  const termDivRef = useRef<HTMLDivElement>(null);

  const handle = getTerminal(pid, cid, theme);
  console.log(`XtermCustom ${pid}-${cid} ${handle.serialize.serialize()}`);

  // Bind the terminal to the DOM on the first render.
  useEffect(() => {
    if (!termDivRef.current) {
      return;
    }
    const terminal = handle.terminal;
    const fit = handle.fit;
    console.log(`open terminal ${pid}-${cid}`);
    try {
      terminal.open(termDivRef.current);
    } catch (e) {
      console.log(`open terminal error ${e}`);
    }
    terminal.write("Loading...\r\n");
    console.log(
      `write terminal ${pid}-${cid} area:${
        handle.terminal.textarea?.value
      } serial:${handle.serialize.serialize()}`
    );

    //fit.fit();
    window.onresize = () => {
      if (termDivRef.current) {
        //fit.fit();
      }
    };
    return () => {
      console.log(`dispose terminal ${pid}-${cid}`);
      terminal.reset();
    };
  }, []);

  const sendKey = api.shell.sendKey.useMutation();
  const resize = api.shell.resize.useMutation();
  useEffect(() => {
    if (!termDivRef.current) {
      return;
    }
    handle.terminal.onData((data) => {
      console.log(`terminal onData: ${data}`);
      sendKey.mutate({ pid: pid, key: data });
    });
    handle.terminal.onResize((size) => {
      console.log(`terminal onResize: ${size}`);
      resize.mutate({ pid: pid, cols: size.cols, rows: size.rows });
    });
    handle.terminal.onWriteParsed((data) => {
      console.log(`terminal onWriteParsed: ${data}`);
    });
  }, []);

  api.shell.onStdout.useSubscription(pid, {
    onError(error) {
      logger.logTrace(`stdout: ${error}`);
    },
    onData: (data) => {
      handle.terminal.write(data.stdout);
    },
  });

  return (
    <ErrorBoundary fallbackRender={XtermCustomError}>
      <div ref={termDivRef} id={`XtermCustom-${pid}`} />
    </ErrorBoundary>
  );
}

function XtermCustomError() {
  return <div>Xterm.js load error.</div>;
}
