import { Box } from "@mui/system";
import styled from "@emotion/styled";
import { useTheme } from "@/AppState";
import { Command, CommandID } from "@/datatypes/Command";
import { AnsiUp } from "@/datatypes/ansiUpCustom";
import DOMPurify from "dompurify";
import { Paper } from "@mui/material";
import { api } from "@/api";
import { usePid } from "@/SessionStates";
import {
  CommandHeader,
  colorLine,
  ResponseStyle,
} from "@/components/ProcessAccordion/CommandResponseCommon";

export function CommandResponse(props: { command: Command }) {
  const { command } = props;
  const theme = useTheme();
  // Convert stdout and stderr to HTML.
  // TODO: Do we have to use xterm serialization for terminal output?
  const ansiUp = new AnsiUp();
  const purifier = DOMPurify();
  const stdoutHTML = purifier.sanitize(
    ansiUp.ansi_to_html(command.stdoutResponse).replace(/\n/g, "<br />")
  );
  const stderrHTML = purifier.sanitize(
    ansiUp.ansi_to_html(command.stderr).replace(/\n/g, "<br />")
  );

  return (
    <ResponseStyle>
      <CommandHeader command={command} />
      <Box sx={{ overflow: "auto" }}>
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
      </Box>
    </ResponseStyle>
  );
}

function RecordedCommandResponse(props: { cid: CommandID }) {
  const pid = usePid();
  const theme = useTheme();
  const command = api.shell.command.useQuery(
    {
      pid: pid,
      cid: props.cid,
    },
    {
      refetchInterval: 1000,
      onError: (error) => {
        console.error(`command fetch error: ${error}`);
      },
    }
  );

  if (!command.data) {
    return <Box>Command not found.</Box>;
  }

  return (
    <ResponseStyle>
      <CommandHeader command={command.data} />
      <Box sx={{ overflow: "auto" }}>
        <Box sx={colorLine(theme.terminal.stdoutColor)}>
          <div
            dangerouslySetInnerHTML={{ __html: command.data.stdoutHTML || "" }}
          />
          <Box sx={colorLine(theme.terminal.stderrColor)}></Box>
          <div
            dangerouslySetInnerHTML={{ __html: command.data.stderrHTML || "" }}
          />
        </Box>
      </Box>
    </ResponseStyle>
  );
}

export function FinishedCommandResponse(props: { cid: CommandID }) {
  const pid = usePid();
  const outputCompleted = api.shell.outputCompleted.useQuery(
    { pid: pid, cid: props.cid },
    {
      refetchInterval: 1000,
      onError: (error) => {
        console.error(`outputCompleted fetch error: ${error}`);
      },
    }
  );
  if (outputCompleted.data) {
    return <RecordedCommandResponse cid={props.cid} />;
  }
  return <Box>Not recorded.</Box>;
}
