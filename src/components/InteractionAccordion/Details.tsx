import {
  AccordionSummary,
  Box,
  Typography,
  AccordionSummaryProps,
  AccordionDetails,
} from "@mui/material";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import styled from "@emotion/styled";
import { Theme } from "@/datatypes/Theme";
import { useTheme } from "@/AppState";

import { AccordionStyle } from "./CommonStyle";
import { ReactNode } from "react";

export function InteractionAccordionDetail(props: {
  children: ReactNode;
  focalPoint: React.RefObject<HTMLDivElement>;
}) {
  const { children, ...detailProps } = props;
  const CommandDetailPadding = {
    paddingLeft: 1.5,
    paddingRight: 0,
    paddingY: 1,
    marginY: -1,
  };

  return (
    <AccordionStyle>
      <AccordionDetails sx={CommandDetailPadding}>
        <div ref={props.focalPoint} tabIndex={0}>
          {children}
        </div>
      </AccordionDetails>
    </AccordionStyle>
  );
}
