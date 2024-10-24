import { Box } from "@mui/material";
import styled from "@emotion/styled";
import { useTheme } from "@/datatypes/Theme";
import { api } from "@/api";
import { ErrorBoundary } from "react-error-boundary";

import { FaFolderOpen as FolderIcon } from "react-icons/fa";
import { FaUserEdit } from "react-icons/fa";
import { logger } from "@/datatypes/Logger";
import { usePid } from "@/SessionStates";

interface CurrentBarProps {}

function CurrentBar(props: CurrentBarProps) {
  const theme = useTheme();
  const pid = usePid();
  const CurrentBarStyle = styled(Box)({
    color: theme.terminal.colors.primary,
    backgroundColor: theme.system.colors.secondaryBackground,
    fontFamily: theme.terminal.font,
    fontSize: theme.terminal.fontSize,
    textAlign: "left",
    padding: "5px 0px 1px 5px", // top right bottom left
  });
  const CurrentDirStyle = styled.span({
    color: theme.terminal.currentDirColor,
  });
  const UserStyle = styled.span({
    color: theme.terminal.userColor,
    float: "right",
    marginRight: "15px",
  });

  const current = api.shell.current.useQuery(pid, {
    refetchInterval: 200,
    onError: (error) => {
      logger.logTrace(`currentDir fetch: ${error}`);
    },
  });

  return (
    <ErrorBoundary fallbackRender={CurrentBarError}>
      <CurrentBarStyle>
        <span>
          <CurrentDirStyle>
            <FolderIcon /> {current.data?.directory}
          </CurrentDirStyle>
          <UserStyle>
            <FaUserEdit /> {current.data?.user}
          </UserStyle>
        </span>
      </CurrentBarStyle>
    </ErrorBoundary>
  );
}

function CurrentBarError() {
  return <Box>CurrentBar load error</Box>;
}

export default CurrentBar;
