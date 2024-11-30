import styled from "@emotion/styled";
import React from "react";
import { Box } from "@mui/material";

type DivProps = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
>;

const FocusBoundaryStyle = styled(Box)(({ theme }) => ({
  ":focus-within": {
    border: `2px solid ${theme.system.focusedFrameColor}`,
    //outline: `2px solid ${theme.system.focusedFrameColor}`,
    //outlineOffset: "-2px",
  },
}));

export default function FocusBoundary(props: {
  children: React.ReactNode;
  defaultBorderColor: string;
  boundaryRef?: React.RefObject<HTMLDivElement>;
}) {
  const { children, defaultBorderColor, ...others } = props;

  return (
    <FocusBoundaryStyle
      ref={props.boundaryRef}
      tabIndex={0}
      className="FocusBoundary"
      // To avoid re-rendering, we put it into sx prop, not in styled.
      sx={{
        ":not(:focus-within)": {
          border: `2px solid ${defaultBorderColor}`,
        },
      }}
    >
      {children}
    </FocusBoundaryStyle>
  );
}
