import { Box } from "@mui/material";
import styled from "@emotion/styled";
import { useTheme } from "@/datatypes/Theme";

interface CurrentBarProps {
  getCurrentDirectory: () => string;
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
    <CurrentBarStyle>
      {props.getCurrentDirectory()}
    </CurrentBarStyle>
  );
}

export default CurrentBar;
