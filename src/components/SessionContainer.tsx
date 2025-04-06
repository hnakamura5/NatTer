import ShellSession from "@/components/ShellSession";
import HoverMenusBar from "@/components/HoverMenusBar";
import { ShellInputBox, TerminalInputBox } from "@/components/InputSubmit";
import { Box } from "@mui/material";
import { useEffect, useState } from "react";
import { Provider as JotaiProvider } from "jotai";

import styled from "@emotion/styled";
import CurrentBar from "@/components/CurrentBar";

import { api } from "@/api";
import { ProcessID, SessionID } from "@/datatypes/SessionID";
import {
  InputText,
  SessionStateJotaiStore,
  shellConfigContext,
  pidContext,
  sessionContext,
  usePid,
  useSession,
} from "@/SessionStates";
import { ErrorBoundary } from "react-error-boundary";
import { EasyFocus } from "@/components/EasyFocus";
import { useConfig, useTheme } from "@/AppState";
import { GlobalFocusMap } from "@/components/GlobalFocusMap";

import { Config, ShellConfig } from "@/datatypes/Config";

import { log } from "@/datatypes/Logger";
import XtermCustom from "./XtermCustom";

const VerticalBox = styled(Box)({
  display: "flex",
  flexDirection: "row",
  height: "100vh",
});

const HorizontalFromBottomBox = styled(Box)({
  display: "flex",
  flexDirection: "column-reverse",
  justifyContent: "flex-start",
  height: "100%",
});

const FullWidthBox = styled(Box)(({ theme }) => ({
  width: `calc(100vw - ${theme.system.hoverMenuWidth} - 10px)`,
  margin: 0,
  padding: 0,
}));

function getDefaultShell(config: Config): ShellConfig {
  if (config.defaultShell) {
    const defaultShell = config.shells.find(
      (shell) => shell.name === config.defaultShell
    );
    if (defaultShell) {
      return defaultShell;
    }
  }
  if (!config.shells.length) {
    throw new Error("No shell is defined in the config.json");
  }
  return config.shells[0];
}

function CommonSessionTemplate(props: {
  sessionID: SessionID;
  pid: ProcessID;
  children: React.ReactNode;
}) {
  return (
    <sessionContext.Provider value={props.sessionID}>
      <pidContext.Provider value={props.pid}>
        <VerticalBox>
          <HoverMenusBar />
          <FullWidthBox>
            <HorizontalFromBottomBox>{props.children}</HorizontalFromBottomBox>
          </FullWidthBox>
        </VerticalBox>
      </pidContext.Provider>
    </sessionContext.Provider>
  );
}

function SessionForTerminal(props: { config: ShellConfig }) {
  const sessionID = useSession();
  const starter = api.terminal.start.useMutation();
  const stopper = api.terminal.stop.useMutation();
  const [pid, setPid] = useState<ProcessID | undefined>(undefined);
  // Start the terminal process.
  useEffect(() => {
    starter
      .mutateAsync(
        { sessionID: sessionID, config: props.config },
        {
          onError: (error) => {
            log.error(`start terminal fetch error: ${error}`);
          },
        }
      )
      .then((result) => {
        log.debug(`start terminal fetch set pid: ${result}`);
        setPid(result);
      });
    return () => {
      if (pid !== undefined) {
        stopper.mutate(pid);
      }
    };
  }, []);

  if (pid === undefined) {
    return <Box>Loading...</Box>;
  }
  // Session for terminal
  // XtermCustom is flex, so filled from bottom by HorizontalFromBottomBox.
  return (
    <CommonSessionTemplate sessionID={sessionID} pid={pid}>
      <TerminalInputBox />
      <XtermCustom />
    </CommonSessionTemplate>
  );
}

function SessionForShell(props: { config: ShellConfig }) {
  const sessionID = useSession();
  const [pid, setPid] = useState<ProcessID | undefined>(undefined);
  const starter = api.shell.start.useMutation();
  const stopper = api.shell.stop.useMutation();
  log.debug(`SessionForShell config: ${props.config.name} pid: ${pid}`);
  // Start the shell process.
  // TODO: This is a temporary solution. We should start out of this component.
  useEffect(() => {
    log.debug(`SessionForShell start`);
    starter
      .mutateAsync(
        {
          sessionID: sessionID,
          config: props.config,
        },
        {
          onError: (error) => {
            log.error(`start fetch shell error: ${error}`);
          },
        }
      )
      .then((result) => {
        log.debug(`start fetch shell set pid: ${result}`);
        setPid(result);
      });
    return () => {
      if (pid !== undefined) {
        log.debug(`SessionForShell stop pid: ${pid}`);
        stopper.mutate(pid);
      }
    };
  }, []);

  if (pid === undefined) {
    return <Box>Loading...</Box>;
  }

  // Session for non interactive shell
  return (
    <CommonSessionTemplate sessionID={sessionID} pid={pid}>
      <ShellInputBox />
      <CurrentBar />
      <ShellSession />
    </CommonSessionTemplate>
  );
}

function SessionForConfig(props: { config: ShellConfig }) {
  if (props.config.interact === "terminal") {
    return <SessionForTerminal config={props.config} />;
  } else {
    return <SessionForShell config={props.config} />;
  }
}

// Main window of the session.
interface SessionContainerProps {}

function SessionContainer(props: SessionContainerProps) {
  const config = useConfig();
  const theme = useTheme();
  const newSession = api.session.newSession.useMutation();

  const [sessionID, setSessionID] = useState<SessionID | undefined>(undefined);

  const defaultShell = getDefaultShell(config);

  useEffect(() => {
    log.debug(`SessionContainer new session`);
    newSession
      .mutateAsync({ title: "Session 1" })
      .then((result) => {
        log.debug(`SessionContainer new session set sessionID: ${result}`);
        setSessionID(result);
      })
      .catch((error) => {
        log.error(`SessionContainer new session error: ${error}`);
      });
  }, []);

  if (sessionID === undefined) {
    return <Box>Loading...</Box>;
  }

  return (
    <ErrorBoundary fallbackRender={SessionContainerError}>
      <sessionContext.Provider value={sessionID}>
        <EasyFocus.Provider
          jumpKey={(e) => {
            return e.ctrlKey && e.key === "j";
          }}
          exitKey={(e) => {
            return e.key === "Escape";
          }}
          badgeStyle={{
            inputtedTagTextColor: "#FF5722",
            backgroundColor: "#1A237E",
            boundaryColor: theme.system.focusedFrameColor,
          }}
        >
          <GlobalFocusMap.Provider>
            <shellConfigContext.Provider value={defaultShell}>
              <JotaiProvider store={SessionStateJotaiStore}>
                <Box
                  sx={{
                    backgroundColor: theme.system.backgroundColor,
                  }}
                >
                  <SessionForConfig config={defaultShell} />
                </Box>
              </JotaiProvider>
            </shellConfigContext.Provider>
          </GlobalFocusMap.Provider>
        </EasyFocus.Provider>
      </sessionContext.Provider>
    </ErrorBoundary>
  );
}

function SessionContainerError() {
  return <Box>SessionContainer load error.</Box>;
}

export default SessionContainer;
