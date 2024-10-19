import Session from "@/components/Session";
import HoverMenusBar from "@/components/HoverMenusBar";
import InputBox from "@/components/InputBox";
import { Box } from "@mui/material";
import { useEffect, useState } from "react";

import styled from "@emotion/styled";
import CurrentBar from "@/components/CurrentBar";

import { api } from "@/api";
import { ProcessID } from "@/server/ShellProcess";
import { ErrorBoundary } from "react-error-boundary";
import { EasyFocus } from "@/components/EasyFocus";
import { useTheme } from "@/datatypes/Theme";
import { GlobalFocusMap } from "@/components/GlobalFocusMap";

const VerticalBox = styled(Box)`
  display: flex;
  flex-direction: row;
  height: 100vh;
`;

const HorizontalBox = styled(Box)`
  display: flex;
  flex-direction: column;
  // border: 1px solid grey;
`;

const FromBottomBox = styled(Box)`
  display: flex;
  align-items: flex-end;
  height: 100%;
`;

const FullWidthBox = styled(Box)`
  display: block;
  width: calc(100vw - 50px);
  margin: 0;
  margin-left: 0px;
  padding: 0;
`;

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
            console.log(`start fetch error: ${error}`);
          },
        }
      )
      .then((result) => {
        console.log(`start fetch set pid: ${result}`);
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
            <VerticalBox>
              <HoverMenusBar pid={pid} />
              <HorizontalBox>
                <FromBottomBox>
                  <FullWidthBox>
                    <Session pid={pid} />
                    <CurrentBar pid={pid} />
                    <InputBox pid={pid} />
                  </FullWidthBox>
                </FromBottomBox>
              </HorizontalBox>
            </VerticalBox>
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
