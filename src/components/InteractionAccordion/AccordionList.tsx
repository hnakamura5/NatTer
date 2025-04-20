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
    <ErrorBoundary fallbackRender={AccordionListError}>
      <Box
        sx={{
          display: "flex", // Use flex to allow Virtuoso's height: 100%
          flexGrow: 1, // *** Key Change: Take available vertical space ***
          flexDirection: "column", // Stack Virtuoso
          minHeight: 0, // *** Key Change: Allow shrinking below content size ***
          width: "100%", // Maintain full width
          height: "100%",
          overflow: "hidden",
        }}
      >
        <Box>{"Placeholder for test"}</Box>
        <Virtuoso
          style={{
            height: "100%",
            width: "100%",
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

function AccordionListError() {
  return <Box>AccordionList load error.</Box>;
}
