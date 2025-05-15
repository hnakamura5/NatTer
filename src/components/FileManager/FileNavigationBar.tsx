import {
  ClickAwayListener,
  IconButton,
  Link,
  Breadcrumbs as MUIBreadcrumbs,
} from "@mui/material";
import styled from "@emotion/styled";

import { AlignRight } from "@/components/Utils";
import { PathParsed } from "@/datatypes/UniversalPath";
import { IconForFileOrFolder, InlineIconAdjustStyle } from "./FileIcon";

import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import { useFileManagerHandle } from "./FileManagerHandle";
import { log } from "@/datatypes/Logger";
import { useScrollIntoViewIfNeeded } from "@dnd-kit/core/dist/hooks/utilities";
import { useState } from "react";
import { BasicInput } from "../BasicInput";

function FileBreadcrumbElement(props: {
  name: string;
  fullPath: string;
  isDir: boolean;
  moveToPath: (path: string) => void;
  useIcon?: boolean;
}) {
  // log.debug(`FileBreadcrumbElement: ${props.name} (${props.fullPath})`);
  const handleClick = (e: React.MouseEvent) => {
    props.moveToPath(props.fullPath);
    e.stopPropagation();
  };
  if (props.useIcon) {
    return (
      <Link color="inherit" onClick={handleClick} style={{ cursor: "pointer" }}>
        <IconForFileOrFolder
          name={props.name}
          isDir={props.isDir}
          isOpen={props.isDir}
          style={{ ...InlineIconAdjustStyle, verticalAlign: "-3px" }}
        />
        {props.name}
      </Link>
    );
  } else {
    return (
      <Link color="inherit" onClick={handleClick}>
        {props.name}
      </Link>
    );
  }
}

function AddBookmarkButton(props: { addBookmark: () => void }) {
  return (
    <IconButton
      onClick={(e) => {
        props.addBookmark();
        e.stopPropagation();
      }}
      sx={{
        scale: 0.9,
        padding: "5px 4px 0 0", // top right bottom left
        verticalAlign: "bottom",
      }}
    >
      <BookmarkBorderIcon fontSize="small" />
    </IconButton>
  );
}

function NavigationInput(props: {
  parsedPath: PathParsed;
  setInputMode: (mode: boolean) => void;
}) {
  const handle = useFileManagerHandle();
  const [text, setText] = useState(props.parsedPath.fullPath);
  const [errorPath, setErrorPath] = useState<boolean>(false);

  log.debug(`NavigationInput: text: ${text}`);
  return (
    <BasicInput
      value={text}
      style={{ width: "100%" }}
      onChange={(e) => setText(e.target.value)}
      autoFocus
      error={errorPath}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          setErrorPath(false);
          handle.moveActivePathTo(text).then((success) => {
            if (success) {
              props.setInputMode(false);
            } else {
              setErrorPath(true);
              setTimeout(() => setErrorPath(false), 1000);
            }
          });
          e.stopPropagation();
        } else if (e.key === "Escape") {
          props.setInputMode(false);
          e.stopPropagation();
        }
      }}
      onBlur={() => props.setInputMode(false)}
    />
  );
}

const FileBreadcrumbFrame = styled.div(({ theme }) => ({
  color: theme.system.textColor,
  backgroundColor: theme.system.inputBackgroundColor,
  fontSize: theme.system.fontSize,
  width: "100%",
  display: "flex",
}));

const Breadcrumbs = styled(MUIBreadcrumbs)(({ theme }) => ({
  color: theme.system.textColor,
  backgroundColor: theme.system.inputBackgroundColor,
  fontFamily: theme.system.font,
  fontSize: theme.system.fontSize,
  padding: "3px 7px 3px 7px", // top right bottom left
  borderRadius: "5px",
}));

export type FileBreadcrumbsProps = {
  parsedPath: PathParsed;
  setInputMode: (mode: boolean) => void;
};

export function FileBreadcrumbs(props: FileBreadcrumbsProps) {
  const { parsedPath } = props;
  const handle = useFileManagerHandle();
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
        key={elementFullPath}
        name={part}
        fullPath={elementFullPath}
        isDir={true}
        moveToPath={handle.moveActivePathTo}
        useIcon={false}
        // useIcon={i > 0}
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
        separator={<NavigateNextIcon sx={{ fontSize: "small" }} />}
        onClick={(e) => {
          log.debug("Click on FileBreadcrumbs");
          props.setInputMode(true);
          e.stopPropagation();
        }}
      >
        {elements}
      </Breadcrumbs>
      <AlignRight>
        <AddBookmarkButton
          addBookmark={() => {
            handle.addBookmark(handle.getActivePath());
          }}
        />
      </AlignRight>
    </FileBreadcrumbFrame>
  );
}

export function FileNavigationBar(props: { parsedPath: PathParsed }) {
  const [inputMode, setInputMode] = useState(false);

  log.debug(
    `FileBreadCrumbOrNavigationInput: ${props.parsedPath.fullPath} inputMode: ${inputMode}`
  );
  return (
    <ClickAwayListener
      onClickAway={() => {
        setInputMode(false);
      }}
    >
      <div style={{ width: "100%" }}>
        {inputMode ? (
          <NavigationInput
            parsedPath={props.parsedPath}
            setInputMode={setInputMode}
          />
        ) : (
          <FileBreadcrumbs
            parsedPath={props.parsedPath}
            setInputMode={setInputMode}
          />
        )}
      </div>
    </ClickAwayListener>
  );
}
