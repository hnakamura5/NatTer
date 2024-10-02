import Session from "@/components/Session";
import HoverMenusBar from "@/components/HoverMenus/HoverMenusBar";
import InputBox from "@/components/InputBox";
import { Box } from "@mui/material";
import { useEffect, useState } from "react";

import styled from "@emotion/styled";
import CurrentBar from "@/components/CurrentBar";

import { api } from "@/api";
import { ProcessID } from "@/server/ShellProcess";
import { ErrorBoundary } from "react-error-boundary";

const VerticalBox = styled(Box)`
  display: flex;
  flex-direction: row;
  height: 100vh;
`;

const HorizontalBox = styled(Box)`
  display: flex;
  flex-direction: column;
  border: 1px solid grey;
`;

const FromBottomBox = styled(Box)`
  display: flex;
  align-items: flex-end;
  height: 100%;
`;

const FullWidthBox = styled(Box)`
  display: block;
  width: calc(100vw - 100px);
  margin: 0;
  margin-left: 10px;
  padding: 0;
`;

// Main window of the session.
interface SessionContainerProps {}

function SessionContainer(props: SessionContainerProps) {
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
      <ErrorBoundary
        fallbackRender={() => <Box>SessionContainer load error.</Box>}
      >
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
      </ErrorBoundary>
    );
  }
}

export default SessionContainer;
