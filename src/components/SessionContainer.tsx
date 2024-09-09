import { useState } from "react";

import Session from "./Session";
import HoverMenusBar from "./HoverMenus/HoverMenusBar";
import InputBox from "./InputBox";
// Main window of the session.

function SessionContainer() {
  return (
    <div>
      <HoverMenusBar />
      <Session />
      <InputBox />
    </div>
  );
}

export default SessionContainer;
