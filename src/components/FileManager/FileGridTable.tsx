import { useFileManagerHandle } from "./FileManagerHandle";
import { api } from "@/api";
import { log } from "@/datatypes/Logger";
import {
  KeyboardEvent,
  MouseEvent,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FileStat,
  UniversalPath,
  univPathToString,
} from "@/datatypes/UniversalPath";
import styled from "@emotion/styled";

import {
  MaterialReactTable,
  MRT_Cell,
  MRT_TableInstance,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from "material-react-table";
import {
  KeybindScope,
  useKeyBindCommandHandler,
  useKeybindOfCommand,
  useKeybindOfCommandScopeRef,
} from "../KeybindScope";
import { useTheme } from "@/AppState";
import { FileGridTableNode, createGridTableNode } from "./FileGridTableNode";

export type FileTreeViewProps = {
  uPath: UniversalPath;
};

export function FileGridTable(props: FileTreeViewProps) {
  const uPath = props.uPath;
  const path = uPath.path;
  const remoteHost = uPath.remoteHost;

  const theme = useTheme();
  const handle = useFileManagerHandle();
  const statListAsync = api.fileManager.statListAsync.useMutation();
  const [data, setData] = useState<FileGridTableNode[]>([]);

  const columns = useMemo<MRT_ColumnDef<FileGridTableNode>[]>(
    () => [
      {
        accessorKey: "nameComponent",
        header: "Name",
      },
      {
        accessorKey: "timeComponent",
        header: "Modified",
      },
      {
        accessorKey: "permissionComponent",
        header: "Permissions",
      },
      {
        accessorKey: "sizeComponent",
        header: "Size",
      },
    ],
    []
  );
  // Handling path changes.
  const reloadStatList = () => {
    log.debug(`reloadStatList: ${path}`);
    return statListAsync.mutateAsync(uPath).then((result) => {
      setData(
        result.map((stat) => {
          return createGridTableNode(stat, handle);
        })
      );
    });
  };
  useEffect(() => {
    reloadStatList();
  }, [univPathToString(uPath), handle]);
  api.fs.pollChange.useSubscription(uPath, {
    onData: () => {
      reloadStatList();
    },
    onError: (e) => {
      log.error(`Failed to pollChange ${path} `, e);
    },
  });

  // Keybinds
  const keybindRef = useKeybindOfCommandScopeRef();
  const keybinds = useKeyBindCommandHandler();
  useKeybindOfCommand(
    "Backspace",
    () => {
      handle.navigateBack();
    },
    keybindRef
  );
  // We have to register cell wise keybind as callback in props.
  const handleKeybindsOfCell = (
    table: MRT_TableInstance<FileGridTableNode>,
    cell: MRT_Cell<FileGridTableNode>
  ) => {
    const node = cell.row.original;
    return (e: KeyboardEvent) => {
      keybinds.on(e, "Enter", () => {
        log.debug(`File Grid Table enter: ${node.name}`);
        if (node.stat.isDir) {
          handle.moveActivePathTo(node.fullPath);
        } else {
          handle.openFile(node.fullPath);
        }
        e.preventDefault();
      });
      keybinds.on(e, "Delete", () => {
        log.debug(`File Grid Table delete: ${node.name}`);
        handle.trash({
          path: node.fullPath,
          remoteHost: remoteHost,
        });
      });
      keybinds.on(e, "SelectAll", () => {
        log.debug(`File Grid Table selectAll: ${node.name}`);
        table.toggleAllRowsSelected();
      });
      keybinds.on(e, "Copy", () => {
        log.debug(`File Grid Table copy: ${node.name}`);
        handle.copySelectionToInternalClipboard();
      });
      keybinds.on(e, "Cut", () => {
        log.debug(`File Grid Table cut: ${node.name}`);
        handle.cutSelectedToInternalClipboard();
      });
      keybinds.on(e, "Paste", () => {
        log.debug(`File Grid Table paste: ${node.name}`);
        handle.pasteFromInternalClipboard();
      });
      keybinds.on(e, "RenameFile", () => {
        log.debug(`File Grid Table rename: ${node.name}`);
        handle.startRenaming(node.fullPath);
        reloadStatList();
      });
    };
  };

  const table = useMaterialReactTable({
    columns,
    data,
    enableColumnOrdering: true,
    columnResizeMode: "onChange",
    enablePagination: false,
    enableColumnResizing: true,
    enableDensityToggle: false,
    enableRowVirtualization: true,
    enableFullScreenToggle: false,
    enableStickyHeader: true,
    enableStickyFooter: true,
    enableTopToolbar: false,
    enableBottomToolbar: false,
    enableRowSelection: true,
    enableFilters: false,
    initialState: {
      density: "compact",
    },
    // Additional props for cell
    muiTableBodyCellProps: (props) => {
      const node = props.row.original;
      const cell = props.cell;
      return {
        id: node.fullPath,
        tabIndex: 0,
        sx: {
          whiteSpace: "wrap",
          fontFamily: theme.system.font,
          "&:focus-within": {
            outline: `2px solid ${theme.system.focusedFrameColor}`,
            outlineOffset: "-2px",
          },
        },
        onDoubleClick: (e: MouseEvent) => {
          log.debug(
            `table double click: name:${node.name} column.id:${props.column.id} row.id:${props.row.id}`
          );
          if (node.stat.isDir) {
            handle.moveActivePathTo(node.fullPath);
          } else {
            handle.openFile(node.fullPath);
          }
        },
        onClick: (e: MouseEvent) => {
          const node = props.row.original;
          const columnName = props.column.id;
          log.debug(`table onClick: ${node.name} at ${columnName}`);
          (e.currentTarget as HTMLDivElement).focus();
        },
        onLoad: (e) => {
          if (cell.row.index === 0 && cell.column.id === "nameComponent") {
            log.debug(
              `table onLoad focus: ${cell.row.original.fullPath} id:${
                (e.currentTarget as HTMLDivElement).id
              }`
            );
            (e.currentTarget as HTMLDivElement).focus();
          }
        },
        onKeyDown: handleKeybindsOfCell(props.table, props.cell),
      };
    },
    muiTableContainerProps: {
      sx: {
        // Modify the redundant space around checkbox.
        "& .MuiTableCell-root:has(.MuiCheckbox-root)": {
          minWidth: "0",
          width: "auto",
        },
      },
    },
  });

  // Handle Selected rows.
  const rowSelection = table.getState().rowSelection;
  useEffect(() => {
    //fetch data based on row selection state or something
    const selectedItems: string[] = [];
    Object.keys(rowSelection).forEach((key) => {
      const row = table.getRow(key);
      const selected = rowSelection[key];
      if (selected) {
        selectedItems.push(row.original.fullPath);
      }
    });
    handle.selectItems(selectedItems);
  }, [table, rowSelection, handle]);

  return (
    <KeybindScope keybindRef={keybindRef}>
      <MaterialReactTable table={table} />
    </KeybindScope>
  );
}
