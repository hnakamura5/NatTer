import { Box, Typography } from "@mui/system";
import styled from "@emotion/styled";
import { useTheme } from "@/AppState";
import { colorLine } from "./CommonStyle";

const StyledBox = styled(Box)(({ theme }) => ({
  backgroundColor: theme.shell.secondaryBackgroundColor,
  marginBottom: "8px",
  borderRadius: "3px",
  padding: "3px 5px 3px 5px",
}));

const HTMLContainer = styled.div(({ theme }) => ({
  fontFamily: `${theme.system.font}`,
  fontSize: `theme.system.fontSize`,
  whiteSpace: "pre-wrap",
  "& span": {
    fontWeight: "600",
  },
}));

export type ChatLikeUserInputProps = {
  html: string;
};

export function ChatLikeUserInput(props: ChatLikeUserInputProps) {
  const theme = useTheme();
  return (
    <StyledBox sx={colorLine(theme.shell.useCommandColor)}>
      <HTMLContainer dangerouslySetInnerHTML={{ __html: props.html }} />
    </StyledBox>
  );
}
