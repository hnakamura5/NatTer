import { useFileManagerHandle } from "./FileManagerHandle";

import { api } from "@/api";
import { log } from "@/datatypes/Logger";
import {
  KeyboardEvent,
  MouseEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
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
  type MRT_Row,
  type MRT_TableOptions,
} from "material-react-table";
import { IconForFileOrFolder, InlineIconAdjustStyle } from "./FileIcon";
import {
  KeybindScope,
  useKeyBindCommandJudge,
  useKeybindOfCommand,
  useKeybindOfCommandScopeRef,
} from "../KeybindScope";
import { FileTreeFileItemContextMenu } from "./FileTreeItemContextMenu";
import { DirectoryLabel } from "./FileTreeItemLabel";
import { ContextMenuContext } from "../Menu/ContextMenu";

function WithFileNodeContextMenu(props: {
  stat: FileStat;
  setRenamingMode: (mode: boolean) => void;
  children: ReactNode;
}) {
  return (
    <ContextMenuContext
      menuItems={
        <FileTreeFileItemContextMenu
          stat={props.stat}
          setRenamingMode={props.setRenamingMode}
        />
      }
    >
      {props.children}
    </ContextMenuContext>
  );
}

function FileNodeComponent(props: {
  name: string;
  isDir: boolean;
  stat: FileStat;
}) {
  return (
    <WithFileNodeContextMenu stat={props.stat} setRenamingMode={() => {}}>
      <IconForFileOrFolder
        name={props.name}
        isDir={props.isDir}
        style={InlineIconAdjustStyle}
      />
      {props.name}
    </WithFileNodeContextMenu>
  );
}

export type FileGridTableNode = {
  name: string;
  fullPath: string;
  time: Date;
  size: number;
  fileTypeDescription: string;
  stat: FileStat;
  nameComponent: ReactNode;
  sizeComponent: ReactNode;
  timeComponent: ReactNode;
  permissionComponent: ReactNode;
};

function permissionToString(permission: number) {
  return (
    ((permission & 0o1000000) > 0 ? "r" : "-") +
    ((permission & 0o0100000) > 0 ? "w" : "-") +
    ((permission & 0o0010000) > 0 ? "x" : "-") +
    ((permission & 0o0001000) > 0 ? "r" : "-") +
    ((permission & 0o0000100) > 0 ? "w" : "-") +
    ((permission & 0o0000010) > 0 ? "x" : "-") +
    ((permission & 0o0000004) > 0 ? "r" : "-") +
    ((permission & 0o0000002) > 0 ? "w" : "-") +
    ((permission & 0o0000001) > 0 ? "x" : "-")
  );
}

function createNode(stat: FileStat): FileGridTableNode {
  const time = new Date(stat.modifiedTime);
  return {
    name: stat.baseName,
    fullPath: stat.fullPath,
    time: time,
    size: stat.byteSize,
    fileTypeDescription: stat.isDir ? "folder" : "file",
    stat: stat,
    nameComponent: (
      <FileNodeComponent name={stat.baseName} isDir={stat.isDir} stat={stat} />
    ),
    sizeComponent: (
      <WithFileNodeContextMenu stat={stat} setRenamingMode={() => {}}>
        <span>{stat.byteSize}</span>
      </WithFileNodeContextMenu>
    ),
    timeComponent: (
      <WithFileNodeContextMenu stat={stat} setRenamingMode={() => {}}>
        <span>
          {time.toLocaleDateString() + " " + time.toLocaleTimeString()}
        </span>
      </WithFileNodeContextMenu>
    ),
    permissionComponent: (
      <WithFileNodeContextMenu stat={stat} setRenamingMode={() => {}}>
        <span>{permissionToString(stat.permissionMode)}</span>
      </WithFileNodeContextMenu>
    ),
  };
}

export type FileTreeViewProps = {
  uPath: UniversalPath;
};

export function FileGridTable(props: FileTreeViewProps) {
  const uPath = props.uPath;
  const path = uPath.path;
  const remoteHost = uPath.remoteHost;

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

  useEffect(() => {
    statListAsync.mutateAsync(uPath).then((result) => {
      setData(result.map(createNode));
    });
  }, [univPathToString(uPath)]);
  api.fs.pollChange.useSubscription(uPath, {
    onData: () => {
      statListAsync.mutateAsync(uPath).then((result) => {
        setData(result.map(createNode));
      });
    },
    onError: (e) => {
      log.error(`Failed to pollChange ${path} `, e);
    },
  });

  const tableBodyRef = useRef<HTMLDivElement>(null);

  // Keybinds
  const keybindRef = useKeybindOfCommandScopeRef();
  const keybinds = useKeyBindCommandJudge();
  useKeybindOfCommand(
    "Backspace",
    () => {
      handle.navigateBack();
    },
    keybindRef
  );
  // We have to register cell wise keybind as callback in props.
  const handleKeydown = (
    table: MRT_TableInstance<FileGridTableNode>,
    cell: MRT_Cell<FileGridTableNode>
  ) => {
    const node = cell.row.original;
    return (e: KeyboardEvent) => {
      keybinds.on(e, "Enter", () => {
        log.debug(`enter: ${node.name}`);
        if (node.isDir) {
          handle.moveActivePathTo(node.fullPath);
          tableBodyRef.current?.focus();
        } else {
          handle.openFile(node.fullPath);
        }
      });
      keybinds.on(e, "Delete", () => {
        log.debug(`delete: ${node.name}`);
        handle.trash({
          path: node.fullPath,
          remoteHost: remoteHost,
        });
      });
      keybinds.on(e, "RenameFile", () => {
        log.debug(`rename: ${node.name}`);
        table.setEditingCell(cell);
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
    initialState: {
      density: "compact",
    },
    // Additional props for cell
    muiTableBodyCellProps: (props) => {
      const node = props.row.original;
      return {
        sx: {
          whiteSpace: "wrap",
        },
        // TODO: Editable to be focusable
        contentEditable: true,
        // To avoid warning "`contentEditable` and contains `children` managed by React"
        suppressContentEditableWarning: true,
        onDoubleClick: (e: MouseEvent) => {
          const columnName = props.column.id;
          log.debug(
            `double click: name:${node.name} column.id:${props.column.id} row.id:${props.row.id}`
          );
          if (node.isDir) {
            handle.moveActivePathTo(node.fullPath);
            tableBodyRef.current?.focus();
          } else {
            handle.openFile(node.fullPath);
          }
        },
        onClick: (e: MouseEvent) => {
          const node = props.row.original;
          const columnName = props.column.id;
          log.debug(`click: ${node.name} at ${columnName}`);
        },
        onKeyDown: handleKeydown(props.table, props.cell),
        onContextMenu: (e: MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          return (
            <FileTreeFileItemContextMenu
              stat={node.stat}
              setRenamingMode={(mode: boolean) => {}}
            />
          );
        },
      };
    },
    muiTableContainerProps: {
      ref: tableBodyRef,
    },
    muiTableBodyProps: {
      //  ref: tableBodyRef,
    },
  });

  return (
    <KeybindScope keybindRef={keybindRef}>
      <MaterialReactTable table={table} />
    </KeybindScope>
  );
}
