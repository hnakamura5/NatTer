import { Box } from "@mui/system";
import styled from "@emotion/styled";
import { useTheme } from "@/AppState";
import { Command, CommandID } from "@/datatypes/Command";
import { AnsiUp } from "@/datatypes/ansiUpCustom";
import DOMPurify from "dompurify";
import { Paper } from "@mui/material";
import { api } from "@/api";

const ResponseStyle = styled(Box)(({ theme }) => ({
  width: "calc(100% + 15px)",
  marginLeft: "-8px",
  backgroundColor: theme.terminal.secondaryBackgroundColor,
  paddingBottom: "5px",
  maxHeight: "calc(50vh - 50px)",
  overflow: "auto",
}));
const CurrentDirStyle = styled.span(({ theme }) => ({
  color: theme.terminal.directoryColor,
}));
const UserStyle = styled.span(({ theme }) => ({
  color: theme.terminal.userColor,
  float: "right",
  marginRight: "10px",
}));
const TimeStyle = styled.span(({ theme }) => ({
  color: theme.terminal.timeColor,
  style: "bold underline",
  marginRight: "10px",
}));

export function CommandResponse(props: { command: Command }) {
  const { command } = props;
  const theme = useTheme();

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

  // Convert stdout and stderr to HTML.
  // TODO: Do we have to use xterm serialization for terminal output?
  const ansiUp = new AnsiUp();
  const purifier = DOMPurify();
  const stdoutHTML = purifier.sanitize(
    ansiUp
      .ansi_to_html(command.stdoutResponse)
      //.replace(/\n/g, "<br />")
      .replace(/\r/g, "<br />")
  );
  const stderrHTML = purifier.sanitize(
    ansiUp
      .ansi_to_html(command.stderr)
      .replace(/\n/g, "<br />")
      .replace(/\r/g, "<br />")
  );

  return (
    <ResponseStyle>
      <Box sx={colorSection(theme.terminal.useCommandColor)}>
        <span>
          <TimeStyle>{command.startTime}</TimeStyle>
          <CurrentDirStyle>{command.currentDirectory}</CurrentDirStyle>
          <UserStyle>{command.user}</UserStyle>
          <br />
          <span>
            {command.styledCommand ? command.styledCommand : command.command}
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
    </ResponseStyle>
  );
}
