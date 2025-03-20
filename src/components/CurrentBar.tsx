import { Box, Icon } from "@mui/material";
import styled from "@emotion/styled";
import { useTheme } from "@/AppState";
import { api } from "@/api";
import { ErrorBoundary } from "react-error-boundary";

import { FaFolderOpen as FolderIcon } from "react-icons/fa";
import { FaUserEdit } from "react-icons/fa";
import { usePid } from "@/SessionStates";

import { log } from "@/datatypes/Logger";

function IconText(props: { icon: React.ReactNode; text?: string }) {
  return (
    <span>
      <span style={{ verticalAlign: "-2px" }}>{props.icon}</span> {props.text}
    </span>
  );
}
const CurrentBarStyle = styled(Box)(({ theme }) => ({
  color: theme.shell.textColor,
  backgroundColor: theme.system.secondaryBackgroundColor,
  fontFamily: theme.shell.font,
  fontSize: theme.shell.fontSize,
  textAlign: "left",
  padding: "3px 8px 0px 5px", // top right bottom left
  overflow: "hidden",
}));

const CurrentDirStyle = styled.span(({ theme }) => ({
  color: theme.shell.directoryColor,
}));

const UserStyle = styled.span(({ theme }) => ({
  color: theme.shell.userColor,
  float: "right",
}));

interface CurrentBarProps {}

function CurrentBar(props: CurrentBarProps) {
  const pid = usePid();

  const current = api.shell.current.useQuery(pid, {
    refetchInterval: 500,
    onError: (error) => {
      log.error(`currentDir fetch error for ${pid}: ${error}`);
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
