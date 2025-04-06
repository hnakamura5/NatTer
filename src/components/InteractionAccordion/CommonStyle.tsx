import { Box } from "@mui/system";
import styled from "@emotion/styled";

export const AccordionStyle = styled(Box)(({ theme }) => ({
  color: theme.shell.textColor,
  backgroundColor: theme.shell.backgroundColor,
  fontFamily: theme.shell.font,
  fontSize: theme.shell.fontSize,
  textAlign: "left",
  overflow: "hidden",
  overflowWrap: "anywhere",
  borderRadius: "3px",
}));

export const LeftAlignBox = styled(Box)(({ theme }) => ({
  overflow: "auto",
  maxHeight: "calc(50vh - 50px)",
  margin: "20px 5px 10px 5px", // top right bottom left
  backgroundColor: theme.shell.secondaryBackgroundColor,
  borderRadius: "8px",
  alignSelf: "flex-start", // Key property for left alignment in a flex column/cross-axis start alignment
  maxWidth: "90%",
  minWidth: "50%",
  // Add any other base styles common to your message bubbles/blocks
}));

export const RightAlignBox = styled(Box)({
  width: "100%",
  "& > *": {
    maxWidth: "90%",
    minWidth: "min(50%, 480px)",
  },
  margin: "15px 10px 10px 0px", // top right bottom left
  display: "flex",
  justifyContent: "flex-end",
});

export const colorLine = (color: string) => {
  return {
    borderLeft: `4px solid ${color}`,
    paddingLeft: 1,
  };
};

export const ResponseAlign = styled(Box)(({ theme }) => ({
  width: "calc(100% + 15px)",
  marginLeft: "-8px",
}));
