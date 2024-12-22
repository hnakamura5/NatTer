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

import { useState } from "react";

import { log } from "@/datatypes/Logger";

const ResponseStyleWithScroll = styled(ResponseStyle)({
  overflow: "auto",
});

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
    <ResponseStyleWithScroll>
      <CommandHeader command={command} />
      <Box sx={{ overflow: "auto" }}>
        <Box sx={colorLine(theme.shell.stdoutColor)}>
          <div
            dangerouslySetInnerHTML={{
              __html: stdoutHTML,
            }}
          />
        </Box>
        <Box sx={colorLine(theme.shell.stderrColor)}>
          <div
            dangerouslySetInnerHTML={{
              __html: stderrHTML,
            }}
          />
        </Box>
      </Box>
    </ResponseStyleWithScroll>
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
    <Box>
      <CommandHeader command={command.data} />
      <ResponseStyleWithScroll>
        <Box sx={colorLine(theme.shell.stdoutColor)}>
          <div
            dangerouslySetInnerHTML={{ __html: command.data.stdoutHTML || "" }}
          />
        </Box>
        <Box sx={colorLine(theme.shell.stderrColor)}>
          <div
            dangerouslySetInnerHTML={{ __html: command.data.stderrHTML || "" }}
          />
        </Box>
      </ResponseStyleWithScroll>
    </Box>
  );
}

export function FinishedCommandResponse(props: { cid: CommandID }) {
  const pid = usePid();

  log.debug(`FinishedCommandResponse: pid-${pid} cid-${props.cid}`);
  const outputCompleted = api.shell.outputCompleted.useQuery(
    { pid: pid, cid: props.cid },
    {
      refetchInterval: 1000,
      onError: (error) => {
        log.error(`outputCompleted fetch error: ${error}`);
      },
    }
  );
  if (outputCompleted.data) {
    return <RecordedCommandResponse cid={props.cid} />;
  }
  return <Box>Not recorded.</Box>;
}

export function AliveCommandResponse(props: { cid: CommandID }) {
  const pid = usePid();
  const cid = props.cid;
  const theme = useTheme();

  const [ansiUp, setAnsiUp] = useState(new AnsiUp());
  const [stdoutHTML, setStdoutHTML] = useState("");
  const [stderrHTML, setStderrHTML] = useState("");

  log.debug(`AliveCommandResponse: pid-${pid} cid-${cid}`);

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

  api.shell.onStdout.useSubscription(
    { pid: pid, cid: cid },
    {
      onError(error) {
        log.error(`stdout: ${error}`);
      },
      onData: (data) => {
        log.debug(
          `stdout onData: cid: ${data.cid} isFinished: ${data.isFinished}, stdout: ${data.stdout} in pid-${pid} cid-${cid}`
        );
        if (data.cid === cid && !data.isFinished) {
          setStdoutHTML((prev) => {
            return (
              prev + ansiUp.ansi_to_html(data.stdout).replace(/\n/g, "<br />")
            );
          });
        }
      },
    }
  );

  if (!command.data) {
    return <Box>Loading...</Box>;
  }

  return (
    <Box>
      <CommandHeader command={command.data} />
      <ResponseStyleWithScroll>
        <Box sx={colorLine(theme.shell.stdoutColor)}>
          <div dangerouslySetInnerHTML={{ __html: stdoutHTML || "" }} />
        </Box>
        <Box sx={colorLine(theme.shell.stderrColor)}>
          <div
            dangerouslySetInnerHTML={{ __html: command.data.stderrHTML || "" }}
          />
        </Box>
      </ResponseStyleWithScroll>
    </Box>
  );
}
