import '@emotion/react'
import { Theme as MUITheme } from '@mui/material/styles';

interface Colors {
  primary: string
  secondary: string
  background: string
  secondaryBackground: string
}

declare module '@emotion/react' {
  export interface Theme  {
    terminal: {
      font: string
      fontSize: string
      colors: Colors
      infoColor: string
      stdoutColor: string
      stderrColor: string
    }
    system: {
      font: string
      colors: Colors
    }
  }
}
