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
    font-family: ${theme.terminal.font};
    font-size: ${theme.terminal.fontSize};
    text-align: left;
    padding: 3px;
  `;

  return (
    <ErrorBoundary
      fallbackRender={() => {
        return <Box>CurrentBar load error</Box>;
      }}
    >
      <CurrentBarStyle>
        {api.shell.currentDir.useQuery(props.pid, {
          onError: (error) => {
            console.log(`currentDir fetch: ${error}`);
          }
        }).data}
      </CurrentBarStyle>
    </ErrorBoundary>
  );
}

export default CurrentBar;
