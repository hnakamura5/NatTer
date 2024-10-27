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
import { useTheme } from "@/datatypes/Theme";
import { GlobalFocusMap } from "@/components/GlobalFocusMap";
import { FileTree } from "@/components/HoverMenus/FileTree";

import { logger } from "@/datatypes/Logger";

const VerticalBox = styled(Box)({
  display: "flex",
  flexDirection: "row",
  height: "100vh",
});

const HorizontalBox = styled(Box)({
  display: "flex",
  flexDirection: "column",
  // border: "1px solid grey",
});

const FromBottomBox = styled(Box)({
  display: "flex",
  alignItems: "flex-end",
  height: "100%",
});

const FullWidthBox = styled(Box)({
  display: "block",
  width: "calc(100vw - 50px)",
  margin: 0,
  marginLeft: 0,
  padding: 0,
});

function FileTreeTest() {
  const pid = usePid();
  const current = api.shell.current.useQuery(pid, {
    onError: (error) => {
      logger.logTrace(`current fetch: ${error}`);
    },
  });
  if (!current.data) {
    return <Box>Loading...</Box>;
  }
  console.log(`FileTreeTest: ${current.data.directory}`);
  return (
    <div>
      {"FileTreeTest"}
      <FileTree home={current.data.directory} />
    </div>
  );
}

// Main window of the session.
interface SessionContainerProps {}

function SessionContainer(props: SessionContainerProps) {
  const theme = useTheme();
  const [pid, setPid] = useState<ProcessID | undefined>(undefined);
  const starter = api.shell.start.useMutation();
  const stopper = api.shell.stop.useMutation();

  // Start the shell process.
  // TODO: This is a temporary solution. We should start out of this component.
  useEffect(() => {
    starter
      .mutateAsync(
        {
          shell: "powershell",
          args: [],
        },
        {
          onError: (error) => {
            logger.logTrace(`start fetch error: ${error}`);
          },
        }
      )
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
  } else {
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
                <VerticalBox>
                  <HoverMenusBar />
                  <HorizontalBox>
                    <FromBottomBox>
                      <FullWidthBox>
                        <Session />
                        <CurrentBar />
                        <InputBox />
                      </FullWidthBox>
                    </FromBottomBox>
                  </HorizontalBox>
                </VerticalBox>
              </pidContext.Provider>
            </JotaiProvider>
          </GlobalFocusMap.Provider>
        </EasyFocus.Provider>
      </ErrorBoundary>
    );
  }
}

function SessionContainerError() {
  return <Box>SessionContainer load error.</Box>;
}

export default SessionContainer;
