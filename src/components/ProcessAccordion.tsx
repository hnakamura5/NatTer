import { useEffect, useRef, useState } from "react";
import { Accordion, AccordionDetails, AccordionSummary } from "@mui/material";
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
import { usePid } from "@/SessionStates";
import { CommandID, ProcessID } from "@/datatypes/Command";
import { UseTRPCQueryOptions } from "@trpc/react-query/shared";

const queryOption = {
  refetchInterval: 500,
  /* eslint-disable @typescript-eslint/no-explicit-any */
  onError(e: any) {
    logger.logTrace(`ProcessAccordion: error ${e}`);
  },
};

const AccordionStyle = styled(Box)(({ theme }) => ({
  color: theme.terminal.textColor,
  backgroundColor: theme.terminal.backgroundColor,
  fontFamily: theme.terminal.font,
  fontSize: theme.terminal.fontSize,
  textAlign: "left",
  overflow: "hidden",
  overflowWrap: "anywhere",
}));

function SummarySelector(props: { cid: CommandID }) {
  const pid = usePid();
  const command = api.shell.command.useQuery(
    {
      pid: pid,
      cid: props.cid,
    },
    queryOption
  );
  if (!command.data) {
    return <Box>Command not found.</Box>;
  }
  return <CommandSummary command={command.data} />;
}

function ProcessAccordionSummary(props: { cid: CommandID }) {
  const theme = useTheme();
  const CommandSummaryPadding = {
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
              color: theme.terminal.textColor,
              margin: -1,
            }}
          />
        }
        sx={CommandSummaryPadding}
      >
        <SummarySelector cid={props.cid} />
      </AccordionSummary>
    </AccordionStyle>
  );
}

function FinishedCommandResponse(props: { cid: CommandID }) {
  const pid = usePid();
  const command = api.shell.command.useQuery(
    {
      pid: pid,
      cid: props.cid,
    },
    queryOption
  );
  if (!command.data) {
    return <Box>Command not found.</Box>;
  }
  return <CommandResponse command={command.data} />;
}

function ResponseSelector(props: { cid: CommandID }) {
  const pid = usePid();
  const cid = props.cid;
  const isFinished = api.shell.isFinished.useQuery(
    {
      pid: pid,
      cid: cid,
    },
    queryOption
  );
  const interactMode = api.shell.interactMode.useQuery(pid);
  if (isFinished.data) {
    console.log(`finished mode`);
    return <FinishedCommandResponse cid={cid} />;
  } else {
    if (interactMode.data == "terminal") {
      console.log(`terminal mode`);
      //return <XtermCustom pid={props.command.pid} cid={props.command.cid} />;
      return <XtermCustom pid={pid} cid={cid} />;
    } else {
      console.log(`other mode`);
      return <FinishedCommandResponse cid={cid} />;
    }
  }
}

function ProcessAccordionDetail(props: {
  cid: CommandID;
  focalPoint: React.RefObject<HTMLDivElement>;
}) {
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
          <ResponseSelector cid={props.cid} />
        </div>
      </AccordionDetails>
    </AccordionStyle>
  );
}

function ProcessKeyHandle(props: {
  cid: CommandID;
  children: React.ReactNode;
}) {
  const pid = usePid();
  const sendKey = api.shell.sendKey.useMutation();
  const isFinished = api.shell.isFinished.useQuery(
    {
      pid: pid,
      cid: props.cid,
    },
    queryOption
  );

  return (
    <div
      onKeyDown={(e) => {
        console.log(`key: ${e.key}`);
        // TODO: handle copy and so on.
        if (isFinished.data) {
          return;
        }
        sendKey.mutate(
          {
            pid: pid,
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
  cid: CommandID;
  isLast?: boolean;
}

function ProcessAccordion(props: ProcessAccordionProps) {
  const pid = usePid();
  const cid = props.cid;
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
  // Expansion control.
  const [expanded, setExpanded] = useState<boolean>(true);
  const handleChange = (_: React.SyntheticEvent, newExpanded: boolean) => {
    setExpanded(newExpanded);
    if (newExpanded) {
      setScrollIntoView(true);
    }
  };
  // Focus control.
  const handleGFM = GlobalFocusMap.useHandle();
  const isFinished = api.shell.isFinished.useQuery(
    {
      pid: pid,
      cid: cid,
    },
    queryOption
  );
  useEffect(() => {
    if (
      props.isLast &&
      isFinished.data &&
      handleGFM.isFocused(GlobalFocusMap.Key.LastCommand)
    ) {
      // If this is the last command and focused,
      // focus back to the input box on finish.
      handleGFM.focus(GlobalFocusMap.Key.InputBox);
    }
  }, [handleGFM, props.isLast, isFinished.data]);
  const focalPoint = useRef<HTMLDivElement>(null);

  //TODO: console.log(`command: ${command.command}, id: ${props.listIndex}`);
  //TODO: console.log(`stderr: ${command.stderr}`);
  console.log(`ProcessAccordion: ${pid}-${cid}`);

  return (
    <ErrorBoundary
      fallbackRender={ProcessAccordionError}
      onError={(error, stack) => {
        logger.logTrace(`ProcessAccordion error: ${error}`);
        console.log(stack);
      }}
    >
      <FocusBoundary defaultBorderColor={theme.terminal.backgroundColor}>
        <ProcessKeyHandle cid={cid}>
          <EasyFocus.Land
            focusTarget={focalPoint}
            onBeforeFocus={() => setExpanded(true)}
            key={`ProcessAccordion-${pid}-${cid}`}
          >
            <GlobalFocusMap.Target
              focusKey={GlobalFocusMap.Key.LastCommand}
              target={props.isLast ? focalPoint : undefined}
            >
              <div ref={top} id={`ProcessAccordion-top-${pid}-${cid}`} />
              <Accordion
                expanded={expanded}
                onChange={handleChange}
                sx={{
                  margin: "0px !important", //TODO: better way?
                }}
                slotProps={{
                  transition: { timeout: 300 },
                }}
              >
                <ProcessAccordionSummary cid={cid} />
                <ProcessAccordionDetail cid={cid} focalPoint={focalPoint} />
              </Accordion>
              <div
                ref={bottom}
                id={`ProcessAccordion-bottom-${pid}-${props.cid}`}
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
