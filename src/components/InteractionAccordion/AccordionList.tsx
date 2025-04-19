import { Box } from "@mui/material";
import { ErrorBoundary } from "react-error-boundary";
import { useState, ReactNode, useMemo } from "react";
import { Virtuoso } from "react-virtuoso";

import { log } from "@/datatypes/Logger";

interface InteractionAccordionListProps {
  length: number;
  member: (i: number) => ReactNode;
}

export function InteractionAccordionList(props: InteractionAccordionListProps) {
  const [hasScrollbarY, setHasScrollbarY] = useState<boolean>(false);
  const array = useMemo(
    () => Array.from({ length: props.length }, (_, i) => i),
    [props.length]
  );
  return (
    <ErrorBoundary fallbackRender={SessionError}>
      <Box
        sx={{
          height: "calc(100vh - 50px)", // TODO: calculate using actual height.
        }}
      >
        <Virtuoso
          style={{
            height: "100%",
          }}
          data={array}
          itemContent={(_, i) => {
            return (
              <Box
                sx={{
                  margin: `10px ${
                    hasScrollbarY ? "10px" : "15px" // right
                  } 10px 15px`, // bottom left
                }}
              >
                {props.member(i)}
              </Box>
            );
          }}
          alignToBottom
          scrollerRef={(scroller) => {
            if (scroller && scroller instanceof HTMLElement) {
              setHasScrollbarY(scroller.scrollHeight >= scroller.clientHeight);
            }
          }}
        />
      </Box>
    </ErrorBoundary>
  );
}

function SessionError() {
  return <Box>Session load error.</Box>;
}
