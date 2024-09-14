import "./App.css";
import SessionContainer from "./components/SessionContainer";
import { Theme } from "@emotion/react";
import { DarkTheme } from "./DefaultTheme";
import { useState } from "react";

function App() {
  const [theme, setTheme] = useState<Theme>(DarkTheme);
  // TODO: ThemeProvider does not work?

  return <SessionContainer theme={theme} />;
}

export default App;
