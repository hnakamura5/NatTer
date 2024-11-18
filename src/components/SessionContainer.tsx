import Session from "@/components/Session";
import HoverMenusBar from "@/components/HoverMenusBar";
import InputBox from "@/components/InputBox";
import { Box } from "@mui/material";
import React, { useEffect, useState } from "react";
import { Provider as JotaiProvider } from "jotai";

import styled from "@emotion/styled";
import CurrentBar from "@/components/CurrentBar";

import { api, ProcessID } from "@/api";
import { pidContext, usePid } from "@/SessionStates";
import { ErrorBoundary } from "react-error-boundary";
import { EasyFocus } from "@/components/EasyFocus";
import { useConfig, useTheme } from "@/AppState";
import { GlobalFocusMap } from "@/components/GlobalFocusMap";
import { FileTree } from "@/components/HoverMenus/FileTree";

import { logger } from "@/datatypes/Logger";
import { Config, ShellConfig } from "@/datatypes/Config";

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

const FullWidthBox = styled(Box)({
  display: "block",
  width: "calc(100vw - 50px)",
  margin: 0,
  marginLeft: 0,
  padding: 0,
});

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

// Main window of the session.
interface SessionContainerProps {}

function SessionContainer(props: SessionContainerProps) {
  const config = useConfig();
  const theme = useTheme();
  const [pid, setPid] = useState<ProcessID | undefined>(undefined);
  const starter = api.shell.start.useMutation();
  const stopper = api.shell.stop.useMutation();

  const defaultShell = getDefaultShell(config);
  console.log(
    `defaultShell: ${defaultShell.name} ${defaultShell.executable} ${defaultShell.args}
     ${defaultShell.kind} ${defaultShell.encoding}`
  );

  // Start the shell process.
  // TODO: This is a temporary solution. We should start out of this component.
  useEffect(() => {
    starter
      .mutateAsync(defaultShell, {
        onError: (error) => {
          logger.logTrace(`start fetch error: ${error}`);
        },
      })
      .then((result) => {
        logger.logTrace(`start fetch set pid: ${result}`);
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
          <JotaiProvider>
            <pidContext.Provider value={pid}>
              <Box
                sx={{
                  backgroundColor: theme.system.backgroundColor,
                }}
              >
                <VerticalBox>
                  <HoverMenusBar />
                  <HorizontalFromBottomBox>
                    <FullWidthBox>
                      <Session />
                      <CurrentBar />
                      <InputBox />
                    </FullWidthBox>
                  </HorizontalFromBottomBox>
                </VerticalBox>
              </Box>
            </pidContext.Provider>
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
