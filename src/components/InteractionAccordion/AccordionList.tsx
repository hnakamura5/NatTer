import { Box } from "@mui/material";
import { ErrorBoundary } from "react-error-boundary";
import { useState, ReactNode, useMemo } from "react";
import { Virtuoso } from "react-virtuoso";

import { log } from "@/datatypes/Logger";
import { FlexColumnGrowHeightBox } from "../Utils";

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
      <FlexColumnGrowHeightBox>
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
                  margin: `16px ${
                    hasScrollbarY ? "16px" : "21px" // right
                  } 16px 21px`, // bottom left
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
      </FlexColumnGrowHeightBox>
    </ErrorBoundary>
  );
}

function AccordionListError() {
  return <Box>AccordionList load error.</Box>;
}
