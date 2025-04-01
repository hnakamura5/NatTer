import {
  AccordionSummary,
  Box,
  Typography,
  AccordionSummaryProps,
} from "@mui/material";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import styled from "@emotion/styled";
import { Theme } from "@/datatypes/Theme";
import { useTheme } from "@/AppState";

import { AccordionStyle } from "./CommonStyle";

export type InteractionAccordionSummaryProps = AccordionSummaryProps;

export function InteractionAccordionSummary(
  props: {
    children: React.ReactNode;
  } & InteractionAccordionSummaryProps
) {
  const { children, ...summaryProps } = props;
  const theme = useTheme();
  const SummaryPadding = {
    paddingX: "5px",
    paddingTop: "5px",
    paddingBottom: "4px",
    marginY: "-15px",
  };

  return (
    <AccordionStyle>
      <AccordionSummary
        expandIcon={
          <ExpandMoreIcon
            sx={{
              color: theme.shell.textColor,
              margin: -1,
            }}
          />
        }
        sx={SummaryPadding}
        {...summaryProps}
      >
        {children}
      </AccordionSummary>
    </AccordionStyle>
  );
}
