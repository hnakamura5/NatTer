import { useEffect, useRef, useState } from "react";
import { Accordion, AccordionDetails, AccordionSummary } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Box } from "@mui/system";
import DomPurify from "dompurify";

import { useTheme } from "@/AppState";
import { api } from "@/api";
import { Command } from "@/datatypes/Command";

import { ErrorBoundary } from "react-error-boundary";
import FocusBoundary from "./FocusBoundary";
import { EasyFocus } from "@/components/EasyFocus";
import {
  useKeybindOfCommand,
  useKeybindOfCommandScopeRef,
  KeybindScope,
  useFixedKeybindsBlocker,
} from "@/components/KeybindScope";

import styled from "@emotion/styled";
import { GlobalFocusMap } from "@/components/GlobalFocusMap";
import { logger } from "@/datatypes/Logger";
import {
  AliveCommandResponse,
  CommandResponse,
  FinishedCommandResponse,
} from "@/components/ProcessAccordion/CommandResponse";
import { CommandSummary } from "@/components/ProcessAccordion/CommandSummary";
import XtermCustom from "@/components/ProcessAccordion/XtermCustom";
import Xterm from "./ProcessAccordion/Xterm";
import { usePid } from "@/SessionStates";
import { CommandID, ProcessID } from "@/datatypes/Command";
import { UseTRPCQueryOptions } from "@trpc/react-query/shared";

import { useHotkeys } from "react-hotkeys-hook";
import {
  evaluateKeyboardEventToTerminalCode,
  isFixedKeyboardEvent,
} from "@/datatypes/Keybind";
import { set } from "zod";

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
  // if (isFinished.data) {
  //   console.log(`finished mode`);
  //   return <FinishedCommandResponse cid={cid} />;
  // } else {
  if (interactMode.data == "terminal") {
    //return <XtermCustom pid={props.command.pid} cid={props.command.cid} />;
    return <XtermCustom pid={pid} cid={cid} />;
  } else {
    if (isFinished.data) {
      return <FinishedCommandResponse cid={cid} />;
    } else {
      return <AliveCommandResponse cid={cid} />;
    }
  }
  // }
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

function ProcessKeySender(props: {
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
        console.log(
          `ProcessKeySender get key: ${e.key}, code: ${e.code}, keyCode: ${e.keyCode}, which: ${e.which}, charCode: ${e.charCode}, ctrl: ${e.ctrlKey}, alt: ${e.altKey}, shift: ${e.shiftKey}, meta: ${e.metaKey}`
        );
        if (isFinished.data) {
          return;
        }
        // Ignore fixed keybinds.
        if (isFixedKeyboardEvent(e)) {
          return;
        }
        const evaluated = evaluateKeyboardEventToTerminalCode(e);
        console.log(`ProcessKeySender evaluated key: ${evaluated}`);
        if (evaluated === undefined || evaluated === "") {
          return;
        }
        console.log(`ProcessKeySender send key: ${evaluated}`);
        sendKey.mutate(
          {
            pid: pid,
            key: evaluated,
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

function IDString(pid: ProcessID, cid: CommandID) {
  return `ProcessAccordion-${pid}-${cid}`;
}

interface ProcessAccordionProps {
  cid: CommandID;
  isLast?: boolean;
}

function ProcessAccordion(props: ProcessAccordionProps) {
  const pid = usePid();
  const cid = props.cid;
  const idStr = IDString(pid, cid);
  const theme = useTheme();

  // Scroll control.
  const top = useRef<HTMLDivElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const [scrollIntoView, setScrollIntoView] = useState<boolean>(false);
  useEffect(() => {
    if (scrollIntoView) {
      setTimeout(() => {
        bottom.current?.scrollIntoView({ behavior: "auto" });
        top.current?.scrollIntoView({ behavior: "auto" });
      }, 500); // TODO: Adhoc time?
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
  const boundaryRef = useRef<HTMLDivElement>(null);
  const handleGFM = GlobalFocusMap.useHandle();
  // Register boundaryRef to GFM
  useEffect(() => {
    handleGFM.set(idStr, {
      focusRef: boundaryRef,
    });
    return () => {
      handleGFM.delete(idStr);
    };
  }, [handleGFM, idStr]);
  const isFinished = api.shell.isFinished.useQuery(
    {
      pid: pid,
      cid: cid,
    },
    queryOption
  );
  const isComplete = api.shell.outputCompleted.useQuery(
    {
      pid: pid,
      cid: cid,
    },
    queryOption
  );
  // On finish of the last command, focus back to the input box.
  useEffect(() => {
    if (
      props.isLast &&
      isFinished.data &&
      handleGFM.isFocused(GlobalFocusMap.GlobalKey.LastCommand)
    ) {
      handleGFM.focus(GlobalFocusMap.GlobalKey.InputBox);
      bottom.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [handleGFM, props.isLast, isFinished.data, isComplete.data]);
  const focalPoint = useRef<HTMLDivElement>(null);

  // Keybind definitions.
  // Global keybinds
  useKeybindOfCommand("ExpandToggleCommandAll", () => {
    console.log(`ExpandToggleCommandAll: ${pid}-${cid}`);
    setExpanded(!expanded);
  });
  // Scoped keybinds
  const keybindRef = useKeybindOfCommandScopeRef();
  useKeybindOfCommand(
    "ExpandToggleCommand",
    () => {
      console.log(`ExpandToggleCommand: ${pid}-${cid}`);
      const currentExpanded = expanded;
      setExpanded(!currentExpanded);
      if (!currentExpanded) {
        setScrollIntoView(true);
      }
      boundaryRef.current?.focus();
    },
    keybindRef
  );
  useKeybindOfCommand(
    "FocusCommandUp",
    () => {
      console.log(`FocusCommandUp: ${pid}-${cid}`);
      handleGFM.focus(IDString(pid, cid - 1));
    },
    keybindRef
  );
  useKeybindOfCommand(
    "FocusCommandDown",
    () => {
      console.log(`FocusCommandDown: ${pid}-${cid}`);
      if (props.isLast) {
        handleGFM.focus(GlobalFocusMap.GlobalKey.InputBox);
      } else {
        handleGFM.focus(IDString(pid, cid + 1));
      }
    },
    keybindRef
  );

  //TODO: console.log(`command: ${command.command}, id: ${props.listIndex}`);
  //TODO: console.log(`stderr: ${command.stderr}`);
  console.log(idStr);

  return (
    <ErrorBoundary
      fallbackRender={ProcessAccordionError}
      onError={(error, stack) => {
        logger.logTrace(`${idStr} error: ${error}`);
        console.log(stack);
      }}
    >
      <ProcessKeySender cid={cid}>
        <KeybindScope keybindRef={keybindRef}>
          <FocusBoundary
            defaultBorderColor={theme.terminal.backgroundColor}
            boundaryRef={boundaryRef}
          >
            <EasyFocus.Land
              focusTarget={focalPoint}
              onBeforeFocus={() => setExpanded(true)}
              key={idStr}
            >
              <GlobalFocusMap.Target
                focusKey={
                  props.isLast
                    ? GlobalFocusMap.GlobalKey.LastCommand
                    : undefined
                }
                focusRef={props.isLast ? focalPoint : undefined}
              >
                <div ref={top} id={`${idStr}-top`} />
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
                <div ref={bottom} id={`${idStr}-bottom`} />
              </GlobalFocusMap.Target>
            </EasyFocus.Land>
          </FocusBoundary>
        </KeybindScope>
      </ProcessKeySender>
    </ErrorBoundary>
  );
}

function ProcessAccordionError() {
  return <Box>ProcessAccordion load error.</Box>;
}

export default ProcessAccordion;
