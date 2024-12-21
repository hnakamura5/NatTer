import {
  IconButton,
  Link,
  Breadcrumbs as MUIBreadcrumbs,
} from "@mui/material";
import styled from "@emotion/styled";

import { AlignRight } from "@/components/AlignUtils";
import { PathParsed } from "@/datatypes/PathAbstraction";
import { IconForFileOrFolder, InlineIconAdjustStyle } from "./FileIcon";

import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";

function FileBreadcrumbElement(props: {
  name: string;
  fullPath: string;
  isDir: boolean;
  useIcon?: boolean;
}) {
  const handleClick = (e) => {
    e.preventDefault();
    console.log("clicked on", props.fullPath);
  };
  if (props.useIcon) {
    return (
      <Link href="/" color="inherit" onClick={handleClick}>
        <IconForFileOrFolder
          name={props.name}
          isDir={props.isDir}
          isOpen={props.isDir}
          style={InlineIconAdjustStyle}
        />
        {props.name}
      </Link>
    );
  } else {
    return (
      <Link href="/" color="inherit" onClick={handleClick}>
        {props.name}
      </Link>
    );
  }
}

function AddBookmarkButton(props: { addBookmark: () => void }) {
  return (
    <IconButton
      onClick={() => {
        console.log("Add bookmark");
        props.addBookmark();
      }}
      sx={{
        scale: 0.9,
        padding: "4px 5px 0 0", // top right bottom left
      }}
    >
      <BookmarkBorderIcon fontSize="small" />
    </IconButton>
  );
}

const FileBreadcrumbFrame = styled.div(({ theme }) => ({
  color: theme.system.textColor,
  backgroundColor: theme.system.backgroundColor,
  fontSize: theme.system.fontSize,
  width: "100%",
  display: "flex",
}));

const Breadcrumbs = styled(MUIBreadcrumbs)(({ theme }) => ({
  color: theme.system.textColor,
  backgroundColor: theme.system.backgroundColor,
  fontFamily: theme.system.font,
  fontSize: theme.system.fontSize,
  padding: "3px 10px 3px 10px", // top right bottom left
  borderRadius: "5px",
}));

export function FileBreadcrumbs(props: { parsedPath: PathParsed }) {
  const { parsedPath } = props;
  const elements = [];
  const hier = parsedPath.dirHier;
  let elementFullPath = "";
  for (let i = 0; i < hier.length; i++) {
    const part = hier[i];
    if (i > 1) {
      // Separator not in the first.
      // Root already has the separator.
      // So, add separator before the second element first.
      elementFullPath += parsedPath.sep;
    }
    elementFullPath += part;
    elements.push(
      <FileBreadcrumbElement
        key={part}
        name={part}
        fullPath={elementFullPath}
        isDir={true}
        useIcon={i > 0}
      />
    );
  }
  return (
    <FileBreadcrumbFrame>
      <Breadcrumbs
        sx={{
          ".MuiBreadcrumbs-separator": {
            marginLeft: "0px",
            marginRight: "0px",
          },
          width: "100%",
        }}
        separator={<NavigateNextIcon fontSize="small" />}
      >
        {elements}
      </Breadcrumbs>
      <AlignRight>
        <AddBookmarkButton addBookmark={() => console.log("add bookmark")} />
      </AlignRight>
    </FileBreadcrumbFrame>
  );
}
