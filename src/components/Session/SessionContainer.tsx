import ShellSession from "@/components/Session/ShellSession";
import SideMenu from "@/components/Session/SideMenu";
import {
  ChatAIInputBox,
  ShellInputBox,
  TerminalInputBox,
} from "@/components/Session/InputSubmit";
import { Box } from "@mui/material";
import { useEffect, useState } from "react";
import { Provider as JotaiProvider } from "jotai";

import styled, { CSSObject } from "@emotion/styled";
import CurrentBar from "@/components/Session/CurrentBar";

import { api } from "@/api";
import { ProcessID, SessionID } from "@/datatypes/SessionID";
import {
  InputText,
  SessionStateJotaiStore,
  shellConfigContext,
  pidContext,
  sessionContext,
  usePid,
  useSession,
} from "@/SessionStates";
import { ErrorBoundary } from "react-error-boundary";
import { EasyFocus } from "@/components/EasyFocus";
import { useConfig, useTheme } from "@/AppState";
import { GlobalFocusMap } from "@/components/GlobalFocusMap";

import { Config, SessionInteraction, ShellConfig } from "@/datatypes/Config";

import { log } from "@/datatypes/Logger";
import XtermCustom from "../XtermCustom";
import {
  ChatAIConfig,
  ChatAIConnectionConfig,
} from "@/datatypes/AIModelConnectionConfigs";
import { getShellConfig } from "@/server/configServer";
import { ChatAISession } from "./ChatAISession";

import Grid from "@mui/material/Grid2";
import MuiDrawer from "@mui/material/Drawer";
import { Theme } from "@/datatypes/Theme";
import DrawerSidebarLayout from "../DrawerSidebarLayout";

const VerticalBox = styled(Box)({
  display: "flex",
  flexDirection: "row",
  height: "100vh",
});

const HorizontalFromBottomBox = styled(Box)({
  display: "flex",
  flexDirection: "column-reverse",
  justifyContent: "flex-start",
  height: "100%",
});

const FullWidthBox = styled(Box)(({ theme }) => ({
  width: `calc(100vw - ${theme.system.hoverMenuWidth} - 10px)`,
  margin: 0,
  padding: 0,
}));

function getDefaultShell(config: Config): ShellConfig {
  if (config.defaultShell) {
    const defaultShell = config.shells.find(
      (shell) => shell.name === config.defaultShell
    );
    if (defaultShell) {
      return defaultShell;
    }
  }
  if (!config.shells.length) {
    throw new Error("No shell is defined in the config.json");
  }
  return config.shells[0];
}

// function CommonSessionAligner(props: { children: React.ReactNode }) {
//   return (
//     <VerticalBox>
//       <HoverMenusBar />
//       <FullWidthBox>
//         <HorizontalFromBottomBox>{props.children}</HorizontalFromBottomBox>
//       </FullWidthBox>
//     </VerticalBox>
//   );
// }

function CommonSessionAligner(props: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(true);
  return (
    <DrawerSidebarLayout
      drawerOpen={drawerOpen}
      sidebarList={
        <SideMenu drawerOpen={drawerOpen} setDrawerOpen={setDrawerOpen} />
      }
    >
      <FullWidthBox>
        <HorizontalFromBottomBox>{props.children}</HorizontalFromBottomBox>
      </FullWidthBox>
    </DrawerSidebarLayout>
  );
}

function CommonSessionTemplateForShell(props: {
  sessionID: SessionID;
  pid: ProcessID;
  configName: string;
  children: React.ReactNode;
}) {
  const [shellConfig, setShellConfig] = useState<ShellConfig | undefined>(
    undefined
  );
  const getShellConfig = api.config.getShellConfig.useMutation();

  useEffect(() => {
    getShellConfig.mutateAsync(props.configName).then((result) => {
      setShellConfig(result);
    });
  }, [props.configName]);

  if (!shellConfig) {
    return <div>Loading...</div>;
  }

  return (
    <shellConfigContext.Provider value={shellConfig}>
      <sessionContext.Provider value={props.sessionID}>
        <pidContext.Provider value={props.pid}>
          <CommonSessionAligner>{props.children}</CommonSessionAligner>
        </pidContext.Provider>
      </sessionContext.Provider>
    </shellConfigContext.Provider>
  );
}

function SessionForTerminal(props: { name: string }) {
  const sessionID = useSession();
  const starter = api.terminal.start.useMutation();
  const stopper = api.terminal.stop.useMutation();
  const [pid, setPid] = useState<ProcessID | undefined>(undefined);
  // Start the terminal process.
  useEffect(() => {
    starter
      .mutateAsync(
        { sessionID: sessionID, name: props.name },
        {
          onError: (error) => {
            log.error(`start terminal fetch error: ${error}`);
          },
        }
      )
      .then((result) => {
        log.debug(`start terminal fetch set pid: ${result}`);
        setPid(result);
      });
    return () => {
      if (pid !== undefined) {
        stopper.mutate(pid);
      }
    };
  }, [props.name, sessionID]);

  if (pid === undefined) {
    return <Box>Loading...</Box>;
  }
  // Session for terminal
  // XtermCustom is flex, so filled from bottom by HorizontalFromBottomBox.
  return (
    <CommonSessionTemplateForShell
      sessionID={sessionID}
      pid={pid}
      configName={props.name}
    >
      <TerminalInputBox />
      <XtermCustom />
    </CommonSessionTemplateForShell>
  );
}

function SessionForShell(props: { name: string }) {
  const sessionID = useSession();
  const [pid, setPid] = useState<ProcessID | undefined>(undefined);
  const starter = api.shell.start.useMutation();
  const stopper = api.shell.stop.useMutation();

  log.debug(`SessionForShell name: ${props.name} pid: ${pid}`);
  // Start the shell process.
  // TODO: This is a temporary solution. We should start out of this component.
  useEffect(() => {
    log.debug(`SessionForShell start`);
    starter
      .mutateAsync(
        {
          sessionID: sessionID,
          name: props.name,
        },
        {
          onError: (error) => {
            log.error(`start fetch shell error: ${error}`);
          },
        }
      )
      .then((result) => {
        log.debug(`start fetch shell set pid: ${result}`);
        setPid(result);
      });
    return () => {
      if (pid !== undefined) {
        log.debug(`SessionForShell stop pid: ${pid}`);
        stopper.mutate(pid);
      }
    };
  }, [props.name, sessionID]);

  if (pid === undefined) {
    return <Box>Loading...</Box>;
  }

  // Session for non interactive shell
  return (
    <CommonSessionTemplateForShell
      sessionID={sessionID}
      pid={pid}
      configName={props.name}
    >
      <ShellInputBox />
      <CurrentBar />
      <ShellSession />
    </CommonSessionTemplateForShell>
  );
}

function SessionForChatAI(props: { name: string }) {
  const sessionID = useSession();

  return (
    <CommonSessionAligner>
      <ChatAIInputBox chatAIName={props.name} />
      <ChatAISession chatAIName={props.name} />
    </CommonSessionAligner>
  );
}

function SessionForInteraction(props: { interaction: SessionInteraction }) {
  if (props.interaction.interaction === "terminal") {
    return <SessionForTerminal name={props.interaction.name} />;
  } else if (props.interaction.interaction === "command") {
    return <SessionForShell name={props.interaction.name} />;
  } else if (props.interaction.interaction === "chatAI") {
    return <SessionForChatAI name={props.interaction.name} />;
  }
}

// Main window of the session.
interface SessionContainerProps {}

function SessionContainer(props: SessionContainerProps) {
  const theme = useTheme();
  const newSession = api.session.newSession.useMutation();
  const getDefaultShell = api.config.getDefaultShell.useMutation();

  const [interaction, setInteraction] = useState<
    SessionInteraction | undefined
  >();
  const [sessionID, setSessionID] = useState<SessionID | undefined>(undefined);

  useEffect(() => {
    log.debug(`SessionContainer new session`);
    newSession
      .mutateAsync({ title: "Session 1" })
      .then((result) => {
        log.debug(`SessionContainer new session set sessionID: ${result}`);
        setSessionID(result);
      })
      .catch((error) => {
        log.error(`SessionContainer new session error: ${error}`);
      });
    // TODO Get this as props?
    getDefaultShell.mutateAsync().then((result) => {
      setInteraction(result);
    });
  }, []);

  if (sessionID === undefined || interaction === undefined) {
    return <Box>Loading...</Box>;
  }

  return (
    <ErrorBoundary fallbackRender={SessionContainerError}>
      <sessionContext.Provider value={sessionID}>
        <EasyFocus.Provider
          jumpKey={(e) => {
            return e.ctrlKey && e.key === "j";
          }}
          exitKey={(e) => {
            return e.key === "Escape";
          }}
          badgeStyle={{
            inputtedTagTextColor: "#FF5722",
            backgroundColor: "#1A237E",
            boundaryColor: theme.system.focusedFrameColor,
          }}
        >
          <GlobalFocusMap.Provider>
            <JotaiProvider store={SessionStateJotaiStore}>
              <Box
                sx={{
                  backgroundColor: theme.system.backgroundColor,
                }}
              >
                <SessionForInteraction interaction={interaction} />
              </Box>
            </JotaiProvider>
          </GlobalFocusMap.Provider>
        </EasyFocus.Provider>
      </sessionContext.Provider>
    </ErrorBoundary>
  );
}

function SessionContainerError() {
  return <Box>SessionContainer load error.</Box>;
}

export default SessionContainer;
