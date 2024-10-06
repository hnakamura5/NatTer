import { useTheme } from "@/datatypes/Theme";
import styled from "@emotion/styled";
import React from "react";

type DivProps = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
>;

export default function FocusBoundary(
  props: {
    children: React.ReactNode;
  } & DivProps
) {
  const { children, ...others } = props;
  const theme = useTheme();
  const FocusBoundaryStyle = styled.div`
    :focus-within {
      outline: none;
      border: 2px solid ${theme.system.focusedFrameColor};
    }
  `;
  return (
    <FocusBoundaryStyle tabIndex={0} {...others}>
      {children}
    </FocusBoundaryStyle>
  );
}
