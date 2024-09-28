import Session from "@/components/Session";
import HoverMenusBar from "@/components/HoverMenus/HoverMenusBar";
import InputBox from "@/components/InputBox";
import { Box } from "@mui/material";

import styled from "@emotion/styled";
import CurrentBar from "@/components/CurrentBar";

import { api } from "@/api";
import { ProcessID } from "@/server/ShellProcess";

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
interface SessionContainerProps {
  pid: ProcessID;
}

function SessionContainer(props: SessionContainerProps) {
  return (
    <VerticalBox>
      <HoverMenusBar pid={props.pid} />
      <HorizontalBox>
        <FromBottomBox>
          <FullWidthBox>
            <Session pid={props.pid} />
            <CurrentBar pid={props.pid} />
            <InputBox pid={props.pid} />
          </FullWidthBox>
        </FromBottomBox>
      </HorizontalBox>
    </VerticalBox>
  );
}

export default SessionContainer;
