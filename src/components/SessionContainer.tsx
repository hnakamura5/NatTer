import { useState } from "react";

import Session from "./Session";
import HoverMenusBar from "./HoverMenus/HoverMenusBar";
import InputBox from "./InputBox";
import { Box } from "@mui/material";

import styled from "@emotion/styled";
import CurrentBar from "./CurrentBar";

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

function SessionContainer() {
  return (
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
  );
}

export default SessionContainer;
