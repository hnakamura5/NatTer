import { useEffect, useRef, useState } from "react";
import { Accordion, AccordionDetails, AccordionSummary } from "@mui/material";
import { Box } from "@mui/system";
import DomPurify from "dompurify";

import { useTheme } from "@/AppState";
import { api } from "@/api";
import { Command } from "@/datatypes/Command";

import { ErrorBoundary } from "react-error-boundary";
import FocusBoundary from "@/components/FocusBoundary";
import { EasyFocus } from "@/components/EasyFocus";
import {
  useKeybindOfCommand,
  useKeybindOfCommandScopeRef,
  KeybindScope,
  useFixedKeybindsBlocker,
} from "@/components/KeybindScope";

import styled from "@emotion/styled";
import { GlobalFocusMap } from "@/components/GlobalFocusMap";
import {
  AliveCommandResponse,
  FinishedCommandResponse,
} from "@/components/ProcessAccordion/CommandResponse";
import { CommandSummary } from "@/components/ProcessAccordion/CommandSummary";
import { usePid } from "@/SessionStates";
import { CommandID } from "@/datatypes/Command";
import { ProcessID } from "@/datatypes/SessionID";

import {
  evaluateKeyboardEventToTerminalCode,
  isFixedKeyboardEvent,
} from "@/datatypes/Keybind";

import { log } from "@/datatypes/Logger";
import { InteractionAccordionSummary } from "@/components/InteractionAccordion/Summary";
import { InteractionAccordionDetail } from "@/components/InteractionAccordion/Details";

const queryOption = (pid: ProcessID, additionalMessage?: string) => ({
  refetchInterval: 500,
  /* eslint-disable @typescript-eslint/no-explicit-any */
  onError(e: any) {
    log.error(`ProcessAccordion: error in ${additionalMessage} for ${pid}`, e);
  },
});

function SummarySelector(props: { cid: CommandID }) {
  const pid = usePid();
  const command = api.shell.command.useQuery(
    {
      pid: pid,
      cid: props.cid,
    },
    queryOption(pid, "SummarySelector")
  );
  if (!command.data) {
    return <Box>Command not found.</Box>;
  }
  return <CommandSummary command={command.data} />;
}

function ResponseSelector(props: { cid: CommandID }) {
  const pid = usePid();
  const cid = props.cid;
  const stdoutIsFinished = api.shell.stdoutIsFinished.useQuery(
    {
      pid: pid,
      cid: cid,
    },
    queryOption(pid, "ResponseSelector")
  );
  if (stdoutIsFinished.data) {
    return <FinishedCommandResponse cid={cid} />;
  } else {
    return <AliveCommandResponse cid={cid} />;
  }
}

function ProcessKeySender(props: {
  cid: CommandID;
  children: React.ReactNode;
}) {
  const pid = usePid();
  const sendKey = api.shell.sendKey.useMutation();
  const stdoutIsFinished = api.shell.stdoutIsFinished.useQuery(
    {
      pid: pid,
      cid: props.cid,
    },
    queryOption(pid, "ProcessKeySender")
  );

  return (
    <div
      onKeyDown={(e) => {
        log.debug(
          `ProcessKeySender get key: ${e.key}, code: ${e.code}, keyCode: ${e.keyCode}, which: ${e.which}, charCode: ${e.charCode}, ctrl: ${e.ctrlKey}, alt: ${e.altKey}, shift: ${e.shiftKey}, meta: ${e.metaKey}`
        );
        if (stdoutIsFinished.data) {
          return;
        }
        // Ignore fixed keybinds.
        if (isFixedKeyboardEvent(e)) {
          return;
        }
        const evaluated = evaluateKeyboardEventToTerminalCode(e);
        log.debug(`ProcessKeySender evaluated key: ${evaluated}`);
        if (evaluated === undefined || evaluated === "") {
          return;
        }
        log.debug(`ProcessKeySender send key: ${evaluated}`);
        sendKey.mutate(
          {
            pid: pid,
            key: evaluated,
          },
          {
            onError: (error) => {
              log.error(`failed to send key: ${error}`);
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

export function ProcessAccordion(props: ProcessAccordionProps) {
  const pid = usePid();
  const cid = props.cid;
  const idStr = IDString(pid, cid);
  const theme = useTheme();

  // Scroll control.
  const top = useRef<HTMLDivElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const [scrollIntoView, setScrollIntoView] = useState<boolean>(false);
  log.debug(`ProcessAccordion cid: ${cid}`);
  useEffect(() => {
    if (scrollIntoView) {
      setTimeout(() => {
        bottom.current?.scrollIntoView({ behavior: "auto" });
        top.current?.scrollIntoView({ behavior: "auto" });
      }, 300); // TODO: Adhoc time?
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
  const isFinished = api.shell.stdoutIsFinished.useQuery(
    {
      pid: pid,
      cid: cid,
    },
    queryOption(pid, "ProcessAccordion isFinished")
  );
  const isComplete = api.shell.outputCompleted.useQuery(
    {
      pid: pid,
      cid: cid,
    },
    queryOption(pid, "ProcessAccordion isComplete")
  );
  // On finish of the last command, focus back to the input box.
  useEffect(() => {
    if (
      props.isLast &&
      isFinished.data &&
      handleGFM.isFocused(GlobalFocusMap.GlobalKey.LastCommand)
    ) {
      log.debug("ProcessAccordion: focus back to input box");
      handleGFM.focus(GlobalFocusMap.GlobalKey.InputBox);
      bottom.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [handleGFM, props.isLast, isFinished.data, isComplete.data]);
  const focalPoint = useRef<HTMLDivElement>(null);

  // Keybind definitions.
  // Global keybinds
  useKeybindOfCommand("ExpandToggleCommandAll", () => {
    log.debug(`ExpandToggleCommandAll: ${pid}-${cid}`);
    setExpanded(!expanded);
  });
  // Scoped keybinds
  const keybindRef = useKeybindOfCommandScopeRef();
  useKeybindOfCommand(
    "ExpandToggleCommand",
    () => {
      // log.debug(`ExpandToggleCommand: ${pid}-${cid}`);
      log.debug(`ExpandToggleCommand: ${pid}-${cid}`);
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
    "FocusListUp",
    () => {
      log.debug(`FocusListUp: ${pid}-${cid}`);
      handleGFM.focus(IDString(pid, cid - 1));
    },
    keybindRef
  );
  useKeybindOfCommand(
    "FocusListDown",
    () => {
      log.debug(`FocusListDown: ${pid}-${cid}`);
      if (props.isLast) {
        handleGFM.focus(GlobalFocusMap.GlobalKey.InputBox);
      } else {
        handleGFM.focus(IDString(pid, cid + 1));
      }
    },
    keybindRef
  );

  return (
    <ErrorBoundary
      fallbackRender={ProcessAccordionError}
      onError={(error, stack) => {
        log.error(`${idStr} error: ${error}, stack: ${stack}`);
      }}
    >
      <ProcessKeySender cid={cid}>
        <KeybindScope keybindRef={keybindRef}>
          <FocusBoundary
            defaultBorderColor={theme.shell.backgroundColor}
            boundaryRef={boundaryRef}
            sx={{
              borderRadius: "5px",
              //marginBottom: "8px",
              // marginRight: "3px",
            }}
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
                  slotProps={{
                    transition: { timeout: 300 },
                  }}
                >
                  <InteractionAccordionSummary>
                    <SummarySelector cid={cid} />
                  </InteractionAccordionSummary>
                  <InteractionAccordionDetail focalPoint={focalPoint}>
                    <ResponseSelector cid={cid} />
                  </InteractionAccordionDetail>
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
