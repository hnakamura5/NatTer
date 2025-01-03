import { Box } from "@mui/system";
import styled from "@emotion/styled";
import { useTheme } from "@/AppState";

import { Command, CommandID } from "@/datatypes/Command";

const CurrentDirStyle = styled.span(({ theme }) => ({
  color: theme.shell.directoryColor,
}));
const UserStyle = styled.span(({ theme }) => ({
  color: theme.shell.userColor,
  float: "right",
  marginRight: "10px",
}));
const TimeStyle = styled.span(({ theme }) => ({
  color: theme.shell.timeColor,
  style: "bold underline",
  marginRight: "10px",
}));

export const ResponseAlign = styled(Box)(({ theme }) => ({
  width: "calc(100% + 15px)",
  marginLeft: "-8px",
}));

export const ResponseStyle = styled(ResponseAlign)(({ theme }) => ({
  maxHeight: "calc(50vh - 50px)",
  backgroundColor: theme.shell.secondaryBackgroundColor,
  paddingBottom: "5px",
}));

export const colorLine = (color: string) => {
  return {
    borderLeft: `4px solid ${color}`,
    paddingLeft: 1,
  };
};
const colorSection = (color: string) => {
  return {
    borderLeft: `4px solid ${color}`,
    paddingLeft: 1,
    // borderBottom: `2px solid ${color}`, // Put bottom line to command?
    paddingBottom: `2px`,
  };
};

export function CommandHeader(props: { command: Command }) {
  const { command } = props;
  const theme = useTheme();
  return (
    <ResponseAlign>
      <Box sx={colorSection(theme.shell.useCommandColor)}>
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
    </ResponseAlign>
  );
}
