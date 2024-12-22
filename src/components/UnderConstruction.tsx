import { useTheme } from "@/AppState";
import React from "react";
import styled from "@emotion/styled";

interface UnderConstructionProps {
  children?: React.ReactNode;
  issueURL?: string;
}

const StyledDiv = styled.div(({ theme }) => ({
  backgroundColor: theme.shell.backgroundColor,
  color: theme.shell.textColor,
  fontFamily: theme.system.font,
  fontSize: theme.system.fontSize,
  padding: "10px",
}));

export function UnderConstruction(props: UnderConstructionProps) {
  return (
    <StyledDiv>
      <h3>🚧Under Construction🚧</h3>
      <a href={props.issueURL}>{`Open Issue`}</a>
      {props.children}
    </StyledDiv>
  );
}
