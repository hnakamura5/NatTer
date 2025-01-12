import { Tooltip, TooltipProps } from "@mui/material";
import styled from "@emotion/styled";
import { ReactNode } from "react";

function PopperStyledTooltip(
  props: {
    className?: string;
    children: ReactNode;
  } & TooltipProps
) {
  return (
    <Tooltip
      {...props}
      classes={{ popper: props.className }}
      title={<div style={{ padding: "5px" }}>{props.title}</div>}
    >
      <span>{props.children}</span>
    </Tooltip>
  );
}

export const TooltipHover = styled(PopperStyledTooltip)(({ theme }) => ({
  [`& .MuiTooltip-tooltip`]: {
    color: theme.system.tooltipColor,
    backgroundColor: theme.system.tooltipBackgroundColor,
    fontFamily: theme.system.font,
    fontSize: theme.system.fontSize,
  },
}));
