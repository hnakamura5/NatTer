import { Box } from "@mui/system";
import styled from "@emotion/styled";
import { useTheme } from "@/AppState";

import { Command, CommandID } from "@/datatypes/Command";

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

export const ResponseStyle = styled(Box)(({ theme }) => ({
  width: "calc(100% + 15px)",
  marginLeft: "-8px",
  maxHeight: "calc(50vh - 50px)",
  backgroundColor: theme.terminal.secondaryBackgroundColor,
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
    borderBottom: `2px solid ${color}`,
    paddingBottom: `2px`,
  };
};

export function CommandHeader(props: { command: Command }) {
  const { command } = props;
  const theme = useTheme();
  return (
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
  );
}

