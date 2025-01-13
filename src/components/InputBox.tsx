import {
  Box,
  Paper as MuiPaper,
  InputBase as MuiInputBase,
  IconButton as MuiIconButton,
  Tooltip,
  TextField,
  Input as MuiInput,
  Icon,
  Menu,
} from "@mui/material";
import styled from "@emotion/styled";
import { useTheme } from "@/AppState";

import { api } from "@/api";
import { useCallback, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import FocusBoundary from "@/components/FocusBoundary";
import React from "react";
import { EasyFocus } from "@/components/EasyFocus";
import { GlobalFocusMap } from "@/components/GlobalFocusMap";
import { InputText, usePid } from "@/SessionStates";
import { useAtom } from "jotai";

import { ControlButtons } from "@/components/InputBox/ControlButtons";
import { Input } from "@/components/InputBox/TextInput";
import {
  useKeybindOfCommand,
  useKeybindOfCommandScopeRef,
} from "@/components/KeybindScope";

import { log } from "@/datatypes/Logger";
import {
  ContextMenu,
  ContextSubMenu,
  ContextMenuStyleBox,
  ContextSubMenuStyleBox,
} from "./Menu/ContextMenu";
import { SubMenu, SubMenuItem } from "./Menu/SubMenu";
import { MenuItem } from "./Menu/MenuItem";

function InputBoxContextMenuContents() {
  return (
    <>
      <MenuItem>test</MenuItem>
      <ContextSubMenu label={<SubMenuItem>nest</SubMenuItem>}>
        <ContextSubMenuStyleBox>
          <MenuItem>nested test</MenuItem>
        </ContextSubMenuStyleBox>
      </ContextSubMenu>
    </>
  );
}

const Paper = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: theme.shell.backgroundColor,
  color: theme.shell.textColor,
  paddingTop: "1px",
  paddingBottom: "3px",
}));

const OverToLeft = styled(Box)(({ theme }) => ({
  position: "relative",
  left: `calc(-${theme.system.hoverMenuWidth})`,
  width: `calc(100% + ${theme.system.hoverMenuWidth})`,
}));

interface InputBoxProps {}

function InputBox(props: InputBoxProps) {
  const theme = useTheme();
  const pid = usePid();
  const inputBoxRef = React.createRef<HTMLInputElement>();

  const execute = api.shell.execute.useMutation();
  const submit = useCallback(
    (command: string) => {
      const encoded = new TextEncoder().encode(command);
      execute.mutate(
        { pid: pid, command: command },
        {
          onError: (error) => {
            log.error(`failed to execute: ${error}`);
          },
        }
      );
    },
    [pid, execute]
  );

  const handleGFM = GlobalFocusMap.useHandle();

  // Keybinds
  const keybindRef = useKeybindOfCommandScopeRef();
  useKeybindOfCommand(
    "FocusCommandUp",
    () => {
      log.debug(`FocusCommandUp from Input`);
      handleGFM.focus(GlobalFocusMap.GlobalKey.LastCommand);
    },
    keybindRef
  );
  useKeybindOfCommand(
    "FocusFileView",
    () => {
      log.debug(`FocusFileView from Input`);
      handleGFM.focus(GlobalFocusMap.GlobalKey.FileView);
    },
    keybindRef
  );

  log.debug("InputBox rendered");

  return (
    <ErrorBoundary fallbackRender={InputBoxError}>
      <OverToLeft>
        <FocusBoundary defaultBorderColor={theme.shell.backgroundColor}>
          <EasyFocus.Land focusTarget={inputBoxRef} name={`InputBox-${pid}`}>
            <GlobalFocusMap.Target
              focusKey={GlobalFocusMap.GlobalKey.InputBox}
              focusRef={inputBoxRef}
            >
              <Paper>
                <ControlButtons submit={submit} />
                <ContextMenu items={<InputBoxContextMenuContents />}>
                  <Input
                    key={`input-${pid}`}
                    inputBoxRef={inputBoxRef}
                    submit={submit}
                  />
                </ContextMenu>
              </Paper>
            </GlobalFocusMap.Target>
          </EasyFocus.Land>
        </FocusBoundary>
      </OverToLeft>
    </ErrorBoundary>
  );
}

function InputBoxError() {
  return <Box>InputBox load error.</Box>;
}

export default InputBox;
