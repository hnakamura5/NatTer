import "@emotion/react";
import { Theme as MUITheme } from "@mui/material/styles";

interface Colors {
  primary: string;
  secondary: string;
  background: string;
  secondaryBackground: string;
}

declare module "@emotion/react" {
  export interface Theme {
    terminal: {
      font: string;
      fontSize: string;
      colors: Colors;
      useCommandColor: string;
      stdoutColor: string;
      stderrColor: string;
      directoryColor: string;
      userColor: string;
      timeColor: string;
      runButtonColor: string;
      runBackgroundButtonColor: string;
      stopButtonColor: string;
      pauseButtonColor: string;
      resumeButtonColor: string;
    };
    system: {
      font: string;
      fontSize: string;
      colors: Colors;
      focusedFrameColor: string;
      hoverMenuWidth: string;
      hoverMenuIconSize: string;
      bookmarkColor: string;
      tagColor: string;
      infoColor: string;
      settingsColor: string;
    };
  }
}
