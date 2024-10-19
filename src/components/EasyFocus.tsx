import React, { useEffect } from "react";
import { set } from "zod";
import { useVisibility } from "./Visibility";

type FocusTagType = { input: string; rest: string } | undefined;

class Manager {
  private jumping = false;
  private lands: [React.RefObject<HTMLElement>, (tag: FocusTagType) => void][] =
    [];
  private landToTag: Map<React.RefObject<HTMLElement>, string> = new Map();
  private tagToLand: Map<string, React.RefObject<HTMLElement>> = new Map();
  private input: string = "";
  private invokeFocus: (
    target: React.RefObject<HTMLElement> | undefined
  ) => void = () => {};
  private setJumping: (jumping: boolean) => void = () => {};

  constructor(public alphabet = "abcdefghijklmnopqrstuvwxyz") {}

  addLand(
    ref: React.RefObject<HTMLElement>,
    setJumpTag: (tag: FocusTagType) => void
  ) {
    this.lands.push([ref, setJumpTag]);
  }
  removeLand(ref: React.RefObject<HTMLElement>) {
    this.lands = this.lands.filter(([land, _]) => land !== ref);
  }

  setInvokeFocus(
    invokeFocus: (target: React.RefObject<HTMLElement> | undefined) => void,
    setJumping: (jumping: boolean) => void = () => {}
  ) {
    this.invokeFocus = invokeFocus;
    this.setJumping = setJumping;
  }

  private calcTagLength(numTags: number) {
    const numAlphabet = this.alphabet.length;
    let lenTag = 1;
    while (Math.floor(numTags / numAlphabet) > 0) {
      lenTag++;
      numTags = Math.floor(numTags / numAlphabet);
    }
    return lenTag;
  }

  jump() {
    console.log(`jump: langs: ${this.lands.length}`);
    if (this.jumping) {
      return;
    }
    if (this.lands.length === 0) {
      return;
    }
    this.jumping = true;
    this.setJumping(true);
    this.input = "";
    const sortedLands = this.lands
      .filter(([land, _]) => land.current !== null)
      .sort((a, b) => {
        return (a[0].current?.tabIndex || 0) - (b[0].current?.tabIndex || 0);
      });
    if (sortedLands.length === 0) {
      // No focusable land.
      this.finishJump();
    }
    const lenTag = this.calcTagLength(sortedLands.length);
    const base = this.alphabet.length;
    for (let i = 0; i < sortedLands.length; i++) {
      let tag = "";
      let num = i;
      for (let j = 0; j < lenTag; j++) {
        tag = this.alphabet[num % base] + tag;
        num = Math.floor(num / base);
      }
      this.landToTag.set(sortedLands[i][0], tag);
      this.tagToLand.set(tag, sortedLands[i][0]);
    }
    this.updateTag();
  }

  isJumping() {
    return this.jumping;
  }

  private tryGetJumpTag(ref: React.RefObject<HTMLElement>) {
    if (!this.jumping) {
      return undefined;
    }
    const refTag = this.landToTag.get(ref);
    if (!refTag) {
      return undefined;
    }
    if (refTag.startsWith(this.input)) {
      return { input: this.input, rest: refTag.slice(this.input.length) };
    }
    return undefined;
  }

  private updateTag() {
    const target = this.tagToLand.get(this.input);
    if (target) {
      console.log(`finished jump to ${this.input}`);
      this.finishJump();
      for (const [ref, setJumpTag] of this.lands) {
        setJumpTag(undefined);
      }
      this.invokeFocus(target);
      return;
    }
    for (const [ref, setJumpTag] of this.lands) {
      const tag = this.tryGetJumpTag(ref);
      setJumpTag(tag);
    }
  }

  inputKey(key: string) {
    if (!this.jumping) {
      return;
    }
    this.input = this.input + key;
    console.log(`inputKey: ${key}, input: ${this.input}`);
    this.updateTag();
  }

  backspace() {
    if (!this.jumping) {
      return;
    }
    if (this.input.length === 0) {
      this.exitJump();
    }
    this.input = this.input.slice(0, this.input.length - 1);
    this.updateTag();
  }

  private finishJump() {
    this.jumping = false;
    this.setJumping(false);
    this.landToTag.clear();
    this.tagToLand.clear();
    this.input = "";
    for (const [ref, setJumpTag] of this.lands) {
      setJumpTag(undefined);
    }
  }

  exitJump() {
    if (this.jumping) {
      console.log(`exitJump`);
      this.finishJump();
    }
  }
}

const ManagerContext = React.createContext(new Manager());
function useManager() {
  return React.useContext(ManagerContext);
}

const ThemeContext = React.createContext<FocusBadgeStyle | undefined>(
  undefined
);
function useManagerTheme() {
  return React.useContext(ThemeContext);
}

// Handle for user to control EasyFocus actions.
class EasyFocusHandle {
  constructor(private manager: Manager | undefined) {}

  // Invoke EasyFocus jump action.
  jump() {
    this.manager?.jump();
  }
  // Check whether the EasyFocus is in jump action.
  isJumping() {
    return this.manager?.isJumping();
  }
  // Works only when the EasyFocus is in jump action. Search the tag.
  sendKey(key: string) {
    this.manager?.inputKey(key);
  }
}
const HandleContext = React.createContext<EasyFocusHandle>(
  new EasyFocusHandle(undefined)
);
function useHandle() {
  return React.useContext(HandleContext);
}

function JumpProvider(props: {
  jumpKey: (e: React.KeyboardEvent<HTMLElement>) => boolean;
  exitKey: (e: React.KeyboardEvent<HTMLElement>) => boolean;
  providerRef: React.RefObject<HTMLDivElement>;
  children: React.ReactNode;
}) {
  const manager = useManager();
  const [jumpTo, setJumpTo] = React.useState<
    React.RefObject<HTMLElement> | undefined
  >(undefined);
  const [jumping, setJumping] = React.useState(false);

  manager.setInvokeFocus(setJumpTo, setJumping);
  useEffect(() => {
    if (jumpTo) {
      console.log(
        `jumpTo: focus current=${jumpTo?.current || "none"} provider=${
          props.providerRef.current || "none"
        }`
      );
      const target = jumpTo.current;
      setJumpTo(undefined);
      setTimeout(() => {
        // Use timeout to avoid the following problems:
        // - the focus event conflict by autofocus attribute.
        // - input the typed key into input elements on focusing.
        // FIXME: Known issue: still the key input is spilled into the input
        //        when it has global autofocus attribute.
        console.log(`useEffect: focus timeout target=${target || "none"}`);
        target?.focus();
      }, 100);
    } else if (jumping) {
      console.log(`useEffect: retrieve focus to provider`);
      // Retrieve the focus to the provider on starting the jump action.
      props.providerRef.current?.focus();
    }
  }, [jumpTo, jumping]);

  return (
    <div
      tabIndex={-1}
      ref={props.providerRef}
      onBlur={(e) => {
        // When the focus is out of the provider, exit the jump action.
        console.log(
          `onBlur: current=${e.currentTarget || "none"} provider=${
            props.providerRef.current || "none"
          } target=${e.target || "none"} relatedTarget=${
            e.relatedTarget || "none"
          }`
        );
        if (e.target === props.providerRef.current) {
          manager.exitJump();
        }
      }}
      onKeyDown={(e) => {
        if (props.jumpKey(e)) {
          manager.jump();
        }
        if (props.exitKey(e)) {
          manager.exitJump();
        }
        if (!e.ctrlKey && !e.altKey && !e.metaKey) {
          manager.inputKey(e.key);
        }
        if (e.key === "Backspace") {
          manager.backspace();
        }
      }}
    >
      {props.children}
    </div>
  );
}

export module EasyFocus {
  export type TagType = FocusTagType;
  export type BadgeStyle = FocusBadgeStyle;

  export function useHandle() {
    return useHandle();
  }

  // Provides the context for EasyFocus.
  export function Provider(props: {
    jumpKey: (e: React.KeyboardEvent<HTMLElement>) => boolean;
    exitKey: (e: React.KeyboardEvent<HTMLElement>) => boolean;
    alphabet?: string;
    children: React.ReactNode;
    badgeStyle?: BadgeStyle;
  }) {
    const ref = React.createRef<HTMLDivElement>();
    const manager = new Manager(props.alphabet);
    const handle = new EasyFocusHandle(manager);
    return (
      <ManagerContext.Provider value={manager}>
        <ThemeContext.Provider value={props.badgeStyle}>
          <HandleContext.Provider value={handle}>
            <JumpProvider
              jumpKey={props.jumpKey}
              exitKey={props.exitKey}
              providerRef={ref}
            >
              {props.children}
            </JumpProvider>
          </HandleContext.Provider>
        </ThemeContext.Provider>
      </ManagerContext.Provider>
    );
  }

  // Define the land where the focus can jumps to. The tag is automatically
  // assigned by the context.
  export function Land(props: {
    children: React.ReactNode;
    focusTarget: React.RefObject<HTMLElement>;
    badgeStyle?: BadgeStyle;
  }) {
    const [jumpTag, setJumpTag] = React.useState<FocusTagType>(undefined);
    const [isVisible, setVisibility] = React.useState(true);
    const manager = useManager();
    const theme = useManagerTheme();
    const ref = React.createRef<HTMLDivElement>();

    // Visibility control.
    useEffect(() => {
      if (!props.focusTarget.current) {
        return;
      }
      const observer = new IntersectionObserver(([entry]) => {
        setVisibility(entry.isIntersecting);
      });
      observer.observe(props.focusTarget.current);
      return () => observer.disconnect();
    }, [ref]);

    // Register the land to the manager.
    useEffect(() => {
      if (!isVisible) {
        return;
      }
      manager.addLand(props.focusTarget, setJumpTag);
      return () => manager.removeLand(props.focusTarget);
    }, [ref, isVisible]);

    // Rendering.
    if (!jumpTag) {
      return <>{props.children}</>;
    }
    // Jump action is in progress.
    let badgeStyle = props.badgeStyle;
    if (!badgeStyle) {
      badgeStyle = theme;
    }
    return (
      <FocusBadge
        inputtedTag={jumpTag.input}
        tagText={jumpTag.rest}
        badgeStyle={badgeStyle}
      >
        <>{props.children}</>
      </FocusBadge>
    );
  }
}

// Badge to overlay the tag on the focus target.
interface FocusBadgeStyle {
  inputtedTagTextColor?: string;
  tagTextColor?: string;
  backgroundColor?: string;
  boundaryColor?: string;
  fontSize?: string;
  fontFamily?: string;
}

function FocusBadge(props: {
  inputtedTag: string;
  tagText: string;
  children: React.ReactNode;
  badgeStyle?: FocusBadgeStyle;
}) {
  const { children, badgeStyle } = props;

  return (
    <div
      style={{
        position: "relative",
      }}
    >
      {children}
      <div
        style={{
          position: "absolute",
          top: "3px",
          //left: "calc(95% - 10px)",
          left: "3px",
          borderRadius: "5px",
          margin: 0,
          padding: "1px 5px",
          border: `2px solid ${badgeStyle?.boundaryColor}`,
          backgroundColor: badgeStyle?.backgroundColor,
          fontSize: badgeStyle?.fontSize,
          fontFamily: badgeStyle?.fontFamily,
        }}
      >
        <span style={{ color: badgeStyle?.inputtedTagTextColor }}>
          {props.inputtedTag}
        </span>
        <span style={{ color: badgeStyle?.tagTextColor }}>{props.tagText}</span>
      </div>
    </div>
  );
}
