import { Theme } from "@emotion/react";
import { DarkTheme } from "../DefaultTheme";

interface CurrentBarProps {
  theme: Theme;
}

function CurrentBar(
  props: CurrentBarProps = {
    theme: DarkTheme,
  }
) {
  return (
    <div>
      <p>CurrentBar</p>
    </div>
  );
}

export default CurrentBar;
