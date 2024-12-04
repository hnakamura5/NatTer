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

import { logger } from "@/datatypes/Logger";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/AppState";
import { Theme } from "@/datatypes/Theme";
import { ErrorBoundary } from "react-error-boundary";
import { CommandID, ProcessID } from "@/datatypes/Command";
import {
  CommandHeader,
  ResponseStyle,
} from "@/components/ProcessAccordion/CommandResponseCommon";

import { api } from "@/api";
import { set } from "zod";

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
      background: theme.terminal.secondaryBackgroundColor,
      foreground: theme.terminal.textColor,
    },
    fontFamily: theme.terminal.font,
    fontSize: pxToNumber(theme.terminal.fontSize),
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
  terminal.resize(512, 64); //[HN] TODO: set appropriate size.
  console.log(`new terminal ${count++}`);
  return {
    terminal: terminal,
    fit: fitAddon,
    serialize: serializeAddon,
    search: searchAddon,
  };
}
interface XtermCustomProps {
  pid: ProcessID;
  cid: CommandID;
}
function XtermCustomAlive(props: XtermCustomProps) {
  const pid = props.pid;
  const cid = props.cid;
  const theme = useTheme();
  const termDivRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<terminalHandle | null>(null);
  const [isFinished, setIsFinished] = useState(false);

  const sendKey = api.shell.sendKey.useMutation();
  const resize = api.shell.resize.useMutation();
  // Bind the terminal to the DOM on the first render.
  useEffect(() => {
    const handle = newTerminal(theme);
    if (!handle) {
      console.log(`no handle ${pid}-${cid}`);
      return;
    }
    handleRef.current = handle;
    if (!termDivRef.current) {
      return;
    }
    const terminal = handle.terminal;
    const fit = handle.fit;
    console.log(`open terminal ${pid}-${cid}`);
    terminal.open(termDivRef.current);
    console.log(
      `write terminal ${pid}-${cid} area:${
        handle.terminal.textarea?.value
      } serial:${handle.serialize.serialize()}`
    );

    //fit.fit();
    window.onresize = () => {
      if (termDivRef.current) {
        fit.fit();
      }
    };
    handle.terminal.onData((data) => {
      console.log(`terminal onData: ${data}`);
      sendKey.mutate({ pid: pid, key: data });
    });
    handle.terminal.onResize((size) => {
      console.log(`terminal onResize: ${size}`);
      resize.mutate({ pid: pid, cols: size.cols, rows: size.rows });
    });
    return () => {
      console.log(`dispose terminal ${pid}-${cid}`);
      terminal.dispose();
    };
  }, []);

  api.shell.onStdout.useSubscription(
    { pid: pid, cid: cid },
    {
      onError(error) {
        logger.logTrace(`stdout: ${error}`);
      },
      onData: (data) => {
        logger.log(
          `stdout onData: cid: ${data.cid} isFinished: ${data.isFinished}, stdout: ${data.stdout} in pid-${pid} cid-${cid}`
        );
        if (data.cid === cid && !data.isFinished) {
          handleRef.current?.terminal.write(data.stdout);
        }
      },
    }
  );

  return (
    <ErrorBoundary fallbackRender={XtermCustomError}>
      <ResponseStyle>
        <div ref={termDivRef} id={`XtermCustom-${pid}-${cid}`} />
      </ResponseStyle>
    </ErrorBoundary>
  );
}

function XtermCustomFinished(props: XtermCustomProps) {
  const theme = useTheme();
  const { pid, cid } = props;
  const termDivRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<terminalHandle | null>(null);
  const command = api.shell.command.useQuery(
    {
      pid: pid,
      cid: cid,
    },
    {
      refetchInterval: 1000,
      onError: (error) => {
        console.error(`command fetch error: ${error}`);
      },
    }
  );

  useEffect(() => {
    const handle = newTerminal(theme);
    handleRef.current = handle;
    const terminal = handle.terminal;
    if (termDivRef.current) {
      terminal.open(termDivRef.current);
      console.log(`open finished terminal ${pid}-${cid}`);
    }
    return () => {
      console.log(`dispose finished terminal ${pid}-${cid}`);
      terminal.dispose();
    };
  }, []);

  useEffect(() => {
    if (command.data) {
      console.log(
        `write finished terminal ${pid}-${cid} stdoutResponse: ${command.data?.stdoutResponse}`
      );
      const size = command.data.terminalSize;
      //handleRef.current?.terminal.resize(size?.cols || 80, size?.rows || 24);
      handleRef.current?.terminal.write(command.data?.stdoutResponse || "");
    }
    handleRef.current?.terminal.onData((data) => {
      console.log(`terminal onData: ${data}`);
    });
  }, [cid, pid, command.data?.stdoutResponse, command.data]);

  if (!command.data) {
    return <Box>Loading.</Box>;
  }

  return (
    <ErrorBoundary fallbackRender={XtermCustomError}>
      <CommandHeader command={command.data} />
      <ResponseStyle>
        <div ref={termDivRef} id={`XtermCustomFinished-${pid}-${cid}`} />
      </ResponseStyle>
    </ErrorBoundary>
  );
}

export default function XtermCustom(props: XtermCustomProps) {
  const { pid, cid } = props;
  const outputCompleted = api.shell.outputCompleted.useQuery(
    { pid: pid, cid: cid },
    {
      refetchInterval: 200,
      onError: (error) => {
        logger.logTrace(`outputCompleted fetch: ${error}`);
      },
    }
  );
  if (outputCompleted.data) {
    // disposeTerminal(pid, cid);
    // return <Box>Finished.</Box>;
    return <XtermCustomFinished pid={pid} cid={cid} />;
  } else {
    return <XtermCustomAlive pid={pid} cid={cid} />;
  }
}

function XtermCustomError() {
  return <div>Xterm.js load error.</div>;
}
