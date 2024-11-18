import { useEffect, useRef, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  AccordionSlots,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Box } from "@mui/system";
import DomPurify from "dompurify";

import { useTheme } from "@/AppState";
import { api } from "@/api";
import { Command, getOutputPartOfStdout } from "@/datatypes/Command";

import { ErrorBoundary } from "react-error-boundary";
import FocusBoundary from "./FocusBoundary";
import { EasyFocus } from "@/components/EasyFocus";

import styled from "@emotion/styled";
import { GlobalFocusMap } from "@/components/GlobalFocusMap";
import { logger } from "@/datatypes/Logger";
import { CommandResponse } from "@/components/ProcessAccordion/CommandResponse";
import { CommandSummary } from "./ProcessAccordion/CommandSummary";
import XtermCustom from "./ProcessAccordion/XtermCustom";
import Xterm from "./ProcessAccordion/Xterm";

const AccordionStyle = styled(Box)(({ theme }) => ({
  color: theme.terminal.textColor,
  backgroundColor: theme.terminal.backgroundColor,
  fontFamily: theme.terminal.font,
  fontSize: theme.terminal.fontSize,
  textAlign: "left",
  overflow: "hidden",
  overflowWrap: "anywhere",
}));

function ProcessAccordionStyle(props: { children: React.ReactNode }) {
  const theme = useTheme();
  return <AccordionStyle>{props.children}</AccordionStyle>;
}

function ProcessAccordionSummary(props: { command: Command }) {
  const theme = useTheme();
  const CommandSummaryPadding = {
    paddingX: "5px",
    paddingTop: "5px",
    paddingBottom: "4px",
    marginY: "-15px",
  };

  return (
    <ProcessAccordionStyle>
      <AccordionSummary
        expandIcon={
          <ExpandMoreIcon
            sx={{
              color: theme.terminal.textColor,
              margin: -1,
            }}
          />
        }
        sx={CommandSummaryPadding}
      >
        <CommandSummary command={props.command} />
      </AccordionSummary>
    </ProcessAccordionStyle>
  );
}

function ResponseSelector(props: { command: Command }) {
  const interactMode = api.shell.interactMode.useQuery(props.command.pid);
  if (interactMode.data == "terminal") {
    console.log(`terminal mode`);
    //return <XtermCustom pid={props.command.pid} cid={props.command.cid} />;
    return <XtermCustom pid={props.command.pid} cid={props.command.cid} />;
  } else {
    console.log(`other mode`);
    return <CommandResponse command={props.command} />;
  }
}

function ProcessAccordionDetail(props: {
  command: Command;
  focalPoint: React.RefObject<HTMLDivElement>;
}) {
  const CommandDetailPadding = {
    paddingLeft: 1.5,
    paddingRight: 0,
    paddingY: 1,
    marginY: -1,
  };

  return (
    <ProcessAccordionStyle>
      <AccordionDetails sx={CommandDetailPadding}>
        <div ref={props.focalPoint} tabIndex={0}>
          <ResponseSelector command={props.command} />
        </div>
      </AccordionDetails>
    </ProcessAccordionStyle>
  );
}

function ProcessKeyHandle(props: {
  command: Command;
  children: React.ReactNode;
}) {
  const command = props.command;
  const sendKey = api.shell.sendKey.useMutation();

  return (
    <div
      onKeyDown={(e) => {
        console.log(`key: ${e.key}`);
        // TODO: handle copy and so on.
        return;
        if (command.isFinished) {
          return;
        }
        sendKey.mutate(
          {
            pid: command.pid,
            key: e.key,
          },
          {
            onError: (error) => {
              logger.logTrace(`failed to send key: ${error}`);
            },
          }
        );
      }}
    >
      {props.children}
    </div>
  );
}

interface ProcessAccordionProps {
  command: Command;
  listIndex: number;
  isLast?: boolean;
}

function ProcessAccordion(props: ProcessAccordionProps) {
  const command = props.command;
  const theme = useTheme();

  // Scroll control.
  const top = useRef<HTMLDivElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const [scrollIntoView, setScrollIntoView] = useState<boolean>(false);
  useEffect(() => {
    if (scrollIntoView) {
      bottom.current?.scrollIntoView({ behavior: "smooth" });
      top.current?.scrollIntoView({ behavior: "smooth" });
      setScrollIntoView(false);
    }
  }, [scrollIntoView]);

  const [expanded, setExpanded] = useState<boolean>(true);
  const handleChange = (_: React.SyntheticEvent, newExpanded: boolean) => {
    setExpanded(newExpanded);
    if (newExpanded) {
      setScrollIntoView(true);
    }
  };

  // Focus control.
  const handleGFM = GlobalFocusMap.useHandle();
  useEffect(() => {
    if (
      props.isLast &&
      command.isFinished &&
      handleGFM.isFocused(GlobalFocusMap.Key.LastCommand)
    ) {
      // If this is the last command and focused,
      // focus back to the input box on finish.
      handleGFM.focus(GlobalFocusMap.Key.InputBox);
    }
  }, [command, handleGFM, props.isLast]);

  const focalPoint = useRef<HTMLDivElement>(null);

  //TODO: console.log(`command: ${command.command}, id: ${props.listIndex}`);
  console.log(`stdout: ${command.stdout}`);
  //TODO: console.log(`stderr: ${command.stderr}`);

  return (
    <ErrorBoundary
      fallbackRender={ProcessAccordionError}
      onError={(error, stack) => {
        logger.logTrace(`ProcessAccordion error: ${error}`);
        console.log(stack);
      }}
    >
      <FocusBoundary defaultBorderColor={theme.terminal.backgroundColor}>
        <ProcessKeyHandle command={command}>
          <EasyFocus.Land
            focusTarget={focalPoint}
            onBeforeFocus={() => setExpanded(true)}
            key={`ProcessAccordion-${props.command.pid}-${props.listIndex}`}
          >
            <GlobalFocusMap.Target
              focusKey={GlobalFocusMap.Key.LastCommand}
              target={props.isLast ? focalPoint : undefined}
            >
              <div
                ref={top}
                id={`ProcessAccordion-top-${props.command.pid}-${props.command.cid}`}
              />
              <Accordion
                expanded={expanded}
                onChange={handleChange}
                sx={{
                  margin: "0px !important", //TODO: better way?
                }}
                slotProps={{
                  transition: { timeout: 500 },
                }}
              >
                <ProcessAccordionSummary command={command} />
                <ProcessAccordionDetail
                  command={command}
                  focalPoint={focalPoint}
                />
              </Accordion>
              <div
                ref={bottom}
                id={`ProcessAccordion-bottom-${props.command.pid}-${props.command.cid}`}
              />
            </GlobalFocusMap.Target>
          </EasyFocus.Land>
        </ProcessKeyHandle>
      </FocusBoundary>
    </ErrorBoundary>
  );
}

function ProcessAccordionError() {
  return <Box>ProcessAccordion load error.</Box>;
}

export default ProcessAccordion;
