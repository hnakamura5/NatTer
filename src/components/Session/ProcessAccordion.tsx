import { useEffect, useRef, useState } from "react";
import { Accordion, AccordionDetails, AccordionSummary } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import LoopICon from "@mui/icons-material/Loop";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { Box } from "@mui/system";
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
import { Theme } from "@emotion/react";
import { logger } from "@/datatypes/Logger";

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
  const marginTop = -0.2;
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

  const AccordionStyle = styled(Box)`
    color: ${theme.terminal.colors.primary};
    background-color: ${theme.terminal.colors.background};
    font-family: ${theme.terminal.font};
    font-size: ${theme.terminal.fontSize};
    text-align: left;
    overflow: hidden;
    overflow-wrap: anywhere;
  `;
  const CommandStyle = styled(Box)`
    width: 100%;
    margin-right: 5px;
    background-color: ${theme.terminal.colors.background};
    padding-left: 0px;
  `;
  const ResponseStyle = styled(Box)`
    width: calc(100% + 15px);
    margin-left: -10px;
    background-color: ${theme.terminal.colors.secondaryBackground};
    padding-bottom: 5px;
  `;

  const CommandInternalPadding = {
    paddingX: 1,
    paddingY: 1,
    marginY: -2,
  };
  const ResponseInternalPadding = {
    paddingX: 1.5,
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
  }
  const CurrentDirStyle = styled.span`
    color: ${theme.terminal.currentDirColor};
  `;
  const UserStyle = styled.span`
    color: ${theme.terminal.userColor};
    float: right;
    margin-right: 10px;
  `;
  const InfoSpan = styled.span`
    background-color: ${theme.terminal.infoColor};
    style: bold;
    margin-right: 10px;
  `;

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
  const stdoutHTML = ansiUp
    .ansi_to_html(getOutputPartOfStdout(command))
    .replace(/\n/g, "<br />");
  const stderrHTML = ansiUp
    .ansi_to_html(command.stderr)
    .replace(/\n/g, "<br />");

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
        <EasyFocus.Land focusTarget={focalPoint}>
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
                  sx={CommandInternalPadding}
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
                      <Box sx={colorSection(theme.terminal.infoColor)}>
                        <span>
                          <InfoSpan>[{command.startTime}]</InfoSpan>
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
