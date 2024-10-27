import { useEffect, useRef, useState } from "react";
import { Accordion, AccordionDetails, AccordionSummary } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import LoopICon from "@mui/icons-material/Loop";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { Box } from "@mui/system";
import DomPurify from "dompurify";

import { useTheme } from "@/datatypes/Theme";
import { api } from "@/api";
import {
  Command,
  getOutputPartOfStdout,
  summarizeCommand,
} from "@/datatypes/Command";

import { ErrorBoundary } from "react-error-boundary";
import FocusBoundary from "../FocusBoundary";
import { EasyFocus } from "@/components/EasyFocus";

import styled from "@emotion/styled";

import { AnsiUp } from "ansi-up";
import { GlobalFocusMap } from "../GlobalFocusMap";
import { Theme, css } from "@emotion/react";
import { logger } from "@/datatypes/Logger";
import DOMPurify from "dompurify";

// The original implementation of ansi_up.js does not escape the space.
// We fix this by force overriding the doEscape method.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(AnsiUp.prototype as any).doEscape = function (txt: any) {
  return txt.replace(/[ &<>]/gm, function (str: string) {
    if (str === " ") return "&nbsp;";
    if (str === "&") return "&amp;";
    if (str === "<") return "&lt;";
    if (str === ">") return "&gt;";
  });
};

function statusIcon(command: Command, theme: Theme) {
  const marginTop = -0.4;
  const marginLeft = -1.0;
  if (command.exitStatusIsOK === undefined) {
    return (
      <LoopICon
        sx={{ scale: 0.7, marginTop: marginTop, marginLeft: marginLeft }}
      />
    );
  }
  if (command.exitStatusIsOK) {
    return (
      <CheckCircleOutlineIcon
        sx={{
          color: theme.terminal.stdoutColor,
          scale: 0.7,
          marginTop: marginTop,
          marginLeft: marginLeft,
        }}
      />
    );
  }
  return (
    <ErrorOutlineIcon
      sx={{
        color: theme.terminal.stderrColor,
        scale: 0.7,
        marginTop: marginTop,
        marginLeft: marginLeft,
      }}
    />
  );
}

interface ProcessAccordionProps {
  command: Command;
  listIndex: number;
  isLast?: boolean;
}

function ProcessAccordion(props: ProcessAccordionProps) {
  const theme = useTheme();

  const AccordionStyle = styled(Box)({
    color: theme.terminal.colors.primary,
    backgroundColor: theme.terminal.colors.background,
    fontFamily: theme.terminal.font,
    fontSize: theme.terminal.fontSize,
    textAlign: "left",
    overflow: "hidden",
    overflowWrap: "anywhere",
  });
  const CommandStyle = styled(Box)({
    width: "100%",
    backgroundColor: theme.terminal.colors.background,
    paddingLeft: "0px",
  });
  const ResponseStyle = styled(Box)({
    width: "calc(100% + 15px)",
    marginLeft: "-10px",
    backgroundColor: theme.terminal.colors.secondaryBackground,
    paddingBottom: "5px",
  });

  const CommandSummaryPadding = {
    paddingX: "5px",
    paddingTop: "5px",
    paddingBottom: "4px",
    marginY: "-15px",
  };
  const ResponseInternalPadding = {
    paddingLeft: 1.5,
    paddingRight: 0,
    paddingY: 1,
    marginY: -1,
  };
  const colorLine = (color: string) => {
    return {
      borderLeft: `4px solid ${color}`,
      paddingLeft: 1,
    };
  };
  const colorSection = (color: string) => {
    return {
      borderLeft: `4px solid ${color}`,
      paddingLeft: 1,
      borderBottom: `2px solid ${color}`,
      paddingBottom: `2px`,
    };
  };
  const CurrentDirStyle = styled.span({
    color: theme.terminal.directoryColor,
  });
  const UserStyle = styled.span({
    color: theme.terminal.userColor,
    float: "right",
    marginRight: "10px",
  });
  const TimeStyle = styled.span({
    color: theme.terminal.timeColor,
    style: "bold underline",
    marginRight: "10px",
  });

  const [expanded, setExpanded] = useState<boolean>(true);
  const handleChange = (_: React.SyntheticEvent, newExpanded: boolean) => {
    setExpanded(newExpanded);
  };

  const command = props.command;
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
  }, [command, props.isLast]);

  const focalPoint = useRef<HTMLDivElement>(null);

  // Convert stdout and stderr to HTML.
  const ansiUp = new AnsiUp();
  const purifier = DOMPurify();
  const stdoutHTML = purifier.sanitize(
    ansiUp.ansi_to_html(getOutputPartOfStdout(command)).replace(/\n/g, "<br />")
  );
  const stderrHTML = purifier.sanitize(
    ansiUp.ansi_to_html(command.stderr).replace(/\n/g, "<br />")
  );

  const sendKey = api.shell.sendKey.useMutation();

  //TODO: console.log(`command: ${command.command}, id: ${props.listIndex}`);
  //TODO: console.log(`stdout: ${command.stdout}`);
  //TODO: console.log(`stderr: ${command.stderr}`);

  return (
    <ErrorBoundary fallbackRender={ProcessAccordionError}>
      <FocusBoundary
        onKeyDown={(e) => {
          console.log(`key: ${e.key}`);
          if (!command.isFinished) {
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
          }
        }}
      >
        <EasyFocus.Land
          focusTarget={focalPoint}
          onBeforeFocus={() => setExpanded(true)}
        >
          <GlobalFocusMap.Target
            focusKey={GlobalFocusMap.Key.LastCommand}
            target={props.isLast ? focalPoint : undefined}
          >
            <Accordion
              expanded={expanded}
              onChange={handleChange}
              sx={{
                margin: "0px !important", //TODO: better way?
              }}
            >
              <AccordionStyle>
                <AccordionSummary
                  expandIcon={
                    <ExpandMoreIcon
                      sx={{
                        color: theme.terminal.colors.primary,
                        margin: -1,
                      }}
                    />
                  }
                  sx={CommandSummaryPadding}
                >
                  {statusIcon(command, theme)}
                  <CommandStyle>
                    <span>{summarizeCommand(command)}</span>
                  </CommandStyle>
                </AccordionSummary>
              </AccordionStyle>
              <AccordionStyle>
                <AccordionDetails sx={ResponseInternalPadding}>
                  <ResponseStyle>
                    <div ref={focalPoint} tabIndex={0}>
                      <Box sx={colorSection(theme.terminal.useCommandColor)}>
                        <span>
                          <TimeStyle>{command.startTime}</TimeStyle>
                          <CurrentDirStyle>
                            {command.currentDirectory}
                          </CurrentDirStyle>
                          <UserStyle>{command.user}</UserStyle>
                          <br />
                          <span>
                            {command.styledCommand
                              ? command.styledCommand
                              : command.command}
                          </span>
                        </span>
                      </Box>
                      <Box sx={colorLine(theme.terminal.stdoutColor)}>
                        <div
                          dangerouslySetInnerHTML={{
                            __html: stdoutHTML,
                          }}
                        />
                      </Box>
                      <Box sx={colorLine(theme.terminal.stderrColor)}>
                        <div
                          dangerouslySetInnerHTML={{
                            __html: stderrHTML,
                          }}
                        />
                      </Box>
                    </div>
                  </ResponseStyle>
                </AccordionDetails>
              </AccordionStyle>
            </Accordion>
          </GlobalFocusMap.Target>
        </EasyFocus.Land>
      </FocusBoundary>
    </ErrorBoundary>
  );
}

function ProcessAccordionError() {
  return <Box>ProcessAccordion load error.</Box>;
}

export default ProcessAccordion;
