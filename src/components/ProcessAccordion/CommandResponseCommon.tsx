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
  marginRight: "2px",
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
  borderRadius: "3px",
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

const CommandStyle = styled(Box)(({ theme }) => ({
  backgroundColor: theme.shell.secondaryBackgroundColor,
  marginBottom: "8px",
  borderRadius: "3px",
  padding: "3px 5px 3px 5px",

}));

const StyledCommandStyle = styled.div(({ theme }) => ({
  fontFamily: `${theme.system.font}`,
  fontSize: `theme.system.fontSize`,
  whiteSpace: "pre-wrap",
  "& span": {
    fontWeight: "600",
  },
}));

export function CommandHeader(props: { command: Command }) {
  const { command } = props;
  const theme = useTheme();
  return (
    <ResponseAlign>
      <span>
        <TimeStyle>{command.startTime}</TimeStyle>
        <CurrentDirStyle>{command.currentDirectory}</CurrentDirStyle>
        <UserStyle>{command.user}</UserStyle>
      </span>
      <CommandStyle sx={colorSection(theme.shell.useCommandColor)}>
        {command.styledCommand ? (
          <StyledCommandStyle
            dangerouslySetInnerHTML={{ __html: command.styledCommand }}
          ></StyledCommandStyle>
        ) : (
          command.command
        )}
      </CommandStyle>
    </ResponseAlign>
  );
}
