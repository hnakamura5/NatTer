import { Accordion, Box } from "@mui/material";
import { ReactNode, useEffect, useRef, useState } from "react";

import { GlobalFocusMap } from "@/components/GlobalFocusMap";
import FocusBoundary from "../FocusBoundary";
import { useTheme } from "@/AppState";
import {
  KeybindScope,
  useKeybindOfCommand,
  useKeybindOfCommandScopeRef,
} from "../KeybindScope";
import { log } from "@/datatypes/Logger";
import { EasyFocus } from "../EasyFocus";
import { ErrorBoundary } from "react-error-boundary";

export type InteractionAccordionProps = {
  id?: string;
  notAutoScroll?: boolean;
  scrollDelay?: number;
  expandTransactionTime?: number;
  focusTarget?: React.RefObject<HTMLElement>;
  globalFocusID?: string; // TODO: Do we need this?
  globalFocusMapKey?: GlobalFocusMap.Key;
};

export function InteractionAccordion(
  props: InteractionAccordionProps & {
    children: NonNullable<ReactNode>;
  }
) {
  const scrollDelay = props.scrollDelay ?? 300;
  const expandTransactionTime = props.expandTransactionTime ?? 300;
  const globalFocusID = props.globalFocusID;
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
      }, scrollDelay); // TODO: Adhoc time?
      setScrollIntoView(false);
    }
  }, [scrollDelay, scrollIntoView]);

  // Expansion control.
  const [expanded, setExpanded] = useState<boolean>(true);
  const onExpandChange = (newExpanded: boolean) => {
    if (newExpanded) {
      setScrollIntoView(true);
    }
    setExpanded(newExpanded);
  };

  // Focus control.
  const boundaryRef = useRef<HTMLDivElement>(null);
  const handleGFM = GlobalFocusMap.useHandle();
  // Register boundaryRef to GFM
  useEffect(() => {
    if (!globalFocusID) {
      return;
    }
    handleGFM.set(globalFocusID, {
      focusRef: props.focusTarget ?? boundaryRef,
    });
    return () => {
      handleGFM.delete(globalFocusID);
    };
  }, [handleGFM, boundaryRef, globalFocusID, props.focusTarget]);

  // Keybind definitions.
  // Global keybinds
  useKeybindOfCommand("ExpandToggleCommandAll", () => {
    log.debug(`ExpandToggleCommandAll: ${props.id}`);
    setExpanded(!expanded);
  });
  // Scoped keybinds
  const keybindRef = useKeybindOfCommandScopeRef();
  useKeybindOfCommand(
    "ExpandToggleCommand",
    () => {
      log.debug(`ExpandToggleCommand: ${props.id}`);
      const currentExpanded = expanded;
      setExpanded(!currentExpanded);
      if (!currentExpanded) {
        setScrollIntoView(true);
      }
      boundaryRef.current?.focus();
    },
    keybindRef
  );

  return (
    <ErrorBoundary
      fallbackRender={InteractionAccordionError}
      onError={(error, stack) => {
        log.error(`${props.id} error: ${error}, stack: ${stack}`);
      }}
    >
      <KeybindScope keybindRef={keybindRef}>
        <FocusBoundary
          defaultBorderColor={theme.shell.backgroundColor}
          boundaryRef={boundaryRef}
          sx={{
            borderRadius: "5px",
            marginBottom: "8px",
          }}
        >
          <EasyFocus.Land
            focusTarget={props.focusTarget ?? boundaryRef}
            onBeforeFocus={() => setExpanded(true)}
          >
            <GlobalFocusMap.Target
              focusKey={props.globalFocusMapKey}
              focusRef={props.focusTarget ?? boundaryRef}
            >
              <div ref={top} />
              <Accordion
                expanded={expanded}
                onChange={(_, expanded) => onExpandChange(expanded)}
                slotProps={{
                  transition: { timeout: expandTransactionTime },
                }}
              >
                {props.children}
              </Accordion>
              <div ref={bottom} />
            </GlobalFocusMap.Target>
          </EasyFocus.Land>
        </FocusBoundary>
      </KeybindScope>
    </ErrorBoundary>
  );
}

function InteractionAccordionError() {
  return <Box>InteractionAccordion load error.</Box>;
}
