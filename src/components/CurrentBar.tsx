import { Box } from "@mui/material";
import styled from "@emotion/styled";
import { useTheme } from "@/datatypes/Theme";
import { ProcessID } from "@/server/ShellProcess";
import { api } from "@/api";
import { ErrorBoundary } from "react-error-boundary";

interface CurrentBarProps {
  pid: ProcessID;
}

function CurrentBar(props: CurrentBarProps) {
  const theme = useTheme();
  const CurrentBarStyle = styled(Box)`
    color: ${theme.terminal.colors.primary};
    background-color: ${theme.system.colors.secondaryBackground};
    font-family: ${theme.terminal.font};
    font-size: ${theme.terminal.fontSize};
    text-align: left;
    padding: 5px 0px 0px 5px; // top right bottom left
  `;
  const currentDir = api.shell.currentDir.useQuery(props.pid, {
    refetchInterval: 200,
    onError: (error) => {
      console.log(`currentDir fetch: ${error}`);
    },
  });

  return (
    <ErrorBoundary fallbackRender={CurrentBarError}>
      <CurrentBarStyle>{currentDir.data}</CurrentBarStyle>
    </ErrorBoundary>
  );
}

function CurrentBarError() {
  return <Box>CurrentBar load error</Box>;
}

export default CurrentBar;
