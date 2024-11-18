import "@emotion/react";
import { Theme as ThemeDataType } from "@/datatypes/Theme";
import { Theme as MUITheme } from "@mui/material/styles";

type MergedTheme = MUITheme & ThemeDataType;

declare module "@emotion/react" {
  export interface Theme extends MergedTheme {}
}
