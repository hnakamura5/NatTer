// https://mui.com/material-ui/react-drawer/#mini-variant-drawer

import { ReactNode } from "react";
import { styled, useTheme, Theme, CSSObject } from "@mui/material/styles";
import Box from "@mui/material/Box";
import MuiDrawer from "@mui/material/Drawer";
const drawerWidth = 240;

const openedMixin = (theme: Theme): CSSObject => ({
  width: drawerWidth,
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: "hidden",
});

const closedMixin = (theme: Theme): CSSObject => ({
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: "hidden",
  width: theme.spacing(5),
  [theme.breakpoints.up("sm")]: {
    width: theme.spacing(6),
  },
});

const Drawer = styled(MuiDrawer, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme }) => ({
  width: drawerWidth,
  flexShrink: 0,
  whiteSpace: "nowrap",
  boxSizing: "border-box",
  variants: [
    {
      props: ({ open }) => open,
      style: {
        ...openedMixin(theme),
        "& .MuiDrawer-paper": openedMixin(theme),
      },
    },
    {
      props: ({ open }) => !open,
      style: {
        ...closedMixin(theme),
        "& .MuiDrawer-paper": closedMixin(theme),
      },
    },
  ],
}));

const Main = styled(Box)(({ theme }) => ({
  display: "flex", // Use flex for its children
  flexDirection: "column", // Stack children vertically
  flexGrow: 1, // Crucial: take remaining horizontal space
  height: "100%", // Take full height from parent
  minWidth: 0, // Prevent content from expanding container width
  overflow: "hidden", // Hide overflow from this container level
}));

export type DrawerSidebarLayoutProps = {
  drawerOpen: boolean;
  sidebarList: ReactNode;
  children: ReactNode;
};

export default function DrawerSidebarLayout(props: DrawerSidebarLayoutProps) {
  const { drawerOpen, sidebarList, children } = props;
  return (
    <Box sx={{ display: "flex", flexGrow: 1, width: "100%", height: "100%" }}>
      <Drawer variant="permanent" open={drawerOpen}>
        {sidebarList}
      </Drawer>
      <Main>{children}</Main>
    </Box>
  );
}
