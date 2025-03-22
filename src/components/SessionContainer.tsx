import ShellSession from "@/components/ShellSession";
import HoverMenusBar from "@/components/HoverMenusBar";
import InputBox from "@/components/InputBox";
import { Box } from "@mui/material";
import { useEffect, useState } from "react";
import { Provider as JotaiProvider } from "jotai";

import styled from "@emotion/styled";
import CurrentBar from "@/components/CurrentBar";

import { api } from "@/api";
import { ProcessID, TerminalID } from "@/datatypes/Command";
import {
  InputText,
  SessionStateJotaiStore,
  pidContext,
  usePid,
} from "@/SessionStates";
import { ErrorBoundary } from "react-error-boundary";
import { EasyFocus } from "@/components/EasyFocus";
import { useConfig, useTheme } from "@/AppState";
import { GlobalFocusMap } from "@/components/GlobalFocusMap";

import { Config, ShellConfig } from "@/datatypes/Config";

import { log } from "@/datatypes/Logger";
import XtermCustom from "./ProcessAccordion/XtermCustom";

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
  pid: ProcessID;
  children: React.ReactNode;
}) {
  return (
    <pidContext.Provider value={props.pid}>
      <VerticalBox>
        <HoverMenusBar />
        <FullWidthBox>
          <HorizontalFromBottomBox>{props.children}</HorizontalFromBottomBox>
        </FullWidthBox>
      </VerticalBox>
    </pidContext.Provider>
  );
}

function SessionForTerminal(props: { config: ShellConfig }) {
  const starter = api.terminal.start.useMutation();
  const stopper = api.terminal.stop.useMutation();
  const [pid, setPid] = useState<ProcessID | undefined>(undefined);
  // Start the terminal process.
  useEffect(() => {
    starter
      .mutateAsync(props.config, {
        onError: (error) => {
          log.error(`start terminal fetch error: ${error}`);
        },
      })
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
  return (
    <CommonSessionTemplate pid={pid}>
      <XtermCustom />
    </CommonSessionTemplate>
  );
}

function SessionForShell(props: { config: ShellConfig }) {
  const [pid, setPid] = useState<ProcessID | undefined>(undefined);
  const starter = api.shell.start.useMutation();
  const stopper = api.shell.stop.useMutation();
  log.debug(`SessionForShell config: ${props.config.name} pid: ${pid}`);
  // Start the shell process.
  // TODO: This is a temporary solution. We should start out of this component.
  useEffect(() => {
    log.debug(`SessionForShell start`);
    starter
      .mutateAsync(props.config, {
        onError: (error) => {
          log.error(`start fetch shell error: ${error}`);
        },
      })
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
    <CommonSessionTemplate pid={pid}>
      <ShellSession />
      <CurrentBar />
      <InputBox />
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

  const defaultShell = getDefaultShell(config);

  return (
    <ErrorBoundary fallbackRender={SessionContainerError}>
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
          <JotaiProvider store={SessionStateJotaiStore}>
            <Box
              sx={{
                backgroundColor: theme.system.backgroundColor,
              }}
            >
              <SessionForConfig config={defaultShell} />
            </Box>
          </JotaiProvider>
        </GlobalFocusMap.Provider>
      </EasyFocus.Provider>
    </ErrorBoundary>
  );
}

function SessionContainerError() {
  return <Box>SessionContainer load error.</Box>;
}

export default SessionContainer;
