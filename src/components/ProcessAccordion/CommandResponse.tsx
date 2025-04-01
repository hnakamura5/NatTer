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
  colorLine,
} from "@/components/ProcessAccordion/CommandResponseCommon";

import { useState } from "react";

import { log } from "@/datatypes/Logger";
import { ChatLikeResponse } from "../InteractionAccordion/ChatLikeResponse";
import { ChatLikeUserInput } from "../InteractionAccordion/ChatLikeUserInput";

const CurrentDirStyle = styled.span(({ theme }) => ({
  color: theme.shell.directoryColor,
}));
const UserStyle = styled.span(({ theme }) => ({
  color: theme.shell.userColor,
  float: "right",
  marginRight: "2px",
}));
const TimeStyle = styled.span(({ theme }) => ({
  color: theme.shell.timeColor,
  style: "bold underline",
  marginRight: "10px",
}));

const ResponseAlign = styled(Box)(({ theme }) => ({
  width: "calc(100% + 15px)",
  marginLeft: "-8px",
}));

function CommandHeader(props: { command: Command }) {
  const { command } = props;
  return (
    <ResponseAlign>
      <span>
        <TimeStyle>{command.startTime}</TimeStyle>
        <CurrentDirStyle>{command.currentDirectory}</CurrentDirStyle>
        <UserStyle>{command.user}</UserStyle>
      </span>
    </ResponseAlign>
  );
}

function RecordedCommandResponse(props: { cid: CommandID }) {
  const pid = usePid();
  const commandQuery = api.shell.command.useQuery(
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

  if (!commandQuery.data) {
    return <Box>Command not found.</Box>;
  }
  const command = commandQuery.data;

  return (
    <Box sx={{ marginRight: "10px", marginBottom: "2px" }}>
      <CommandHeader command={command} />
      <ChatLikeUserInput
        html={command.styledCommand || `<span>${command.command}</span>`}
      />
      <ChatLikeResponse
        successHtml={command.stdoutHTML || ""}
        errorHtml={command.stderrHTML || ""}
      />
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

const ResponseStyle = styled(ResponseAlign)(({ theme }) => ({
  maxHeight: "calc(50vh - 50px)",
  backgroundColor: theme.shell.secondaryBackgroundColor,
  paddingBottom: "5px",
  borderRadius: "3px",
}));

const ResponseStyleWithScroll = styled(ResponseStyle)({
  overflow: "auto",
});

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
          `stdout onData: cid: ${data.cid} isFinished: ${data.stdoutIsFinished}, stdout: ${data.stdout} in pid-${pid} cid-${cid}`
        );
        if (data.cid === cid && !data.stdoutIsFinished) {
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
