import { Box } from "@mui/system";
import styled from "@emotion/styled";
import { useTheme } from "@/AppState";
import { colorLine, LeftAlignBox } from "./CommonStyle";

export type ChatLikeResponseProps = {
  successHtml?: string;
  errorHtml?: string;
};

export function ChatLikeResponse(props: ChatLikeResponseProps) {
  const theme = useTheme();
  return (
    <>
      {(props.successHtml || props.errorHtml) && (
        <LeftAlignBox>
          {props.successHtml && (
            <Box sx={colorLine(theme.shell.stdoutColor)}>
              <div
                dangerouslySetInnerHTML={{
                  __html: props.successHtml,
                }}
              />
            </Box>
          )}
          {props.errorHtml && (
            <Box sx={colorLine(theme.shell.stderrColor)}>
              <div
                dangerouslySetInnerHTML={{
                  __html: props.errorHtml,
                }}
              />
            </Box>
          )}
        </LeftAlignBox>
      )}
    </>
  );
}
