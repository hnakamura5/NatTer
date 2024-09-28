import Session from "@/components/Session";
import HoverMenusBar from "@/components/HoverMenus/HoverMenusBar";
import InputBox from "@/components/InputBox";
import { Box } from "@mui/material";
import { useState } from "react";

import styled from "@emotion/styled";
import CurrentBar from "@/components/CurrentBar";

import { api } from "@/api";
import { ProcessID } from "@/server/ShellProcess";
import { PowerShellSpecification } from "@/builtin/shell/Powershell";

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

  // Start the shell process.
  api.shell.start.useMutation().mutate(
    {
      shellSpec: PowerShellSpecification,
      args: [],
    },
    {
      onSuccess: (data) => {
        setPid(data);
      },
    }
  );

  if (pid === undefined) {
    return (<Box>Loading...</Box>);
  }
  return (
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
  );
}

export default SessionContainer;
