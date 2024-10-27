import { useTheme } from "@/datatypes/Theme";
import React from 'react';
import styled from '@emotion/styled';

interface UnderConstructionProps {
  children?: React.ReactNode;
  issueURL?: string;
}

export function UnderConstruction(props: UnderConstructionProps) {
  const theme = useTheme();
  const StyledDiv = styled.div({
    backgroundColor: theme.terminal.colors.background,
    color: theme.terminal.colors.primary,
    fontFamily: theme.system.font,
    fontSize: theme.system.fontSize,
    padding: "10px",
  });

  return (
    <StyledDiv>
      <h3>🚧Under Construction🚧</h3>
      <a href={props.issueURL}>{`Open Issue`}</a>
      {props.children}
    </StyledDiv>
  );
}
