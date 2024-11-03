import { Box, Icon } from "@mui/material";
import styled from "@emotion/styled";
import { useTheme } from "@/AppState";
import { api } from "@/api";
import { ErrorBoundary } from "react-error-boundary";

import { FaFolderOpen as FolderIcon } from "react-icons/fa";
import { FaUserEdit } from "react-icons/fa";
import { logger } from "@/datatypes/Logger";
import { usePid } from "@/SessionStates";

function IconText(props: { icon: React.ReactNode; text?: string }) {
  return (
    <span>
      <span style={{ verticalAlign: "-2px" }}>{props.icon}</span> {props.text}
    </span>
  );
}

interface CurrentBarProps {}

function CurrentBar(props: CurrentBarProps) {
  const theme = useTheme();
  const pid = usePid();
  const CurrentBarStyle = styled(Box)({
    color: theme.terminal.textColor,
    backgroundColor: theme.system.secondaryBackgroundColor,
    fontFamily: theme.terminal.font,
    fontSize: theme.terminal.fontSize,
    textAlign: "left",
    padding: "3px 0px 0px 5px", // top right bottom left
  });
  const CurrentDirStyle = styled.span({
    color: theme.terminal.directoryColor,
  });
  const UserStyle = styled.span({
    color: theme.terminal.userColor,
    float: "right",
    marginRight: "5px",
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
            <IconText icon={<FolderIcon />} text={current.data?.directory} />
          </CurrentDirStyle>
          <UserStyle>
            <IconText icon={<FaUserEdit />} text={current.data?.user} />
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
