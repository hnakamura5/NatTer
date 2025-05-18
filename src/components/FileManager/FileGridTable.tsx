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
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_Row,
  type MRT_TableOptions,
} from "material-react-table";
import { IconForFileOrFolder, InlineIconAdjustStyle } from "./FileIcon";
import {
  useKeybindOfCommand,
  useKeybindOfCommandScopeRef,
} from "../KeybindScope";

export type FileGridTableNode = {
  icon: ReactNode;
  name: string;
  fullPath: string;
  isDir: boolean;
  time: string;
  size: number;
  fileTypeDescription: string;
  permissions: string;
};

function permissionToString(permission: number) {
  return (
    ((permission & 0o1000) > 0 ? "r" : "-") +
    ((permission & 0o0100) > 0 ? "w" : "-") +
    ((permission & 0o0010) > 0 ? "x" : "-") +
    ((permission & 0o0004) > 0 ? "r" : "-") +
    ((permission & 0o0002) > 0 ? "w" : "-") +
    ((permission & 0o0001) > 0 ? "x" : "-")
  );
}

function createNode(stat: FileStat): FileGridTableNode {
  return {
    icon: (
      <IconForFileOrFolder
        name={stat.baseName}
        isDir={stat.isDir}
        style={InlineIconAdjustStyle}
      />
    ),
    name: stat.baseName,
    fullPath: stat.fullPath,
    isDir: stat.isDir,
    time: stat.modifiedTime,
    size: stat.byteSize,
    fileTypeDescription: stat.isDir ? "folder" : "file",
    permissions: permissionToString(stat.permissionMode),
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
        accessorKey: "icon",
        header: "",
      },
      {
        accessorKey: "name",
        header: "Name",
      },
      {
        accessorKey: "size",
        header: "Size",
      },
      {
        accessorKey: "time",
        header: "Modified",
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

  // Keybinds
  const keybindRef = useKeybindOfCommandScopeRef();
  useKeybindOfCommand("Backspace", () => handle.navigateBack(), keybindRef);

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
    enableTopToolbar: false,
    enableStickyHeader: true,
    enableRowSelection: true,
    initialState: {
      density: "compact",
    },
    // Additional props for cell
    muiTableBodyCellProps: (props) => ({
      ref: keybindRef.current,
      sx: {
        whiteSpace: "wrap",
      },
      onDoubleClick: (e: MouseEvent) => {
        const node = props.row.original;
        log.debug(
          `double click: name:${node.name} column.id:${props.column.id} row.id:${props.row.id}`
        );
        if (node.isDir) {
          handle.moveActivePathTo(node.fullPath);
        } else {
          handle.openFile(node.fullPath);
        }
      },
      onClick: (e: MouseEvent) => {
        const node = props.row.original;
        log.debug(`click: ${node.name}`);
      },
      onKeyDown: (e: KeyboardEvent) => {
        if (e.key === "Enter") {
          const node = props.row.original;
          log.debug(`enter: ${node.name}`);
          if (node.isDir) {
            handle.moveActivePathTo(node.fullPath);
          } else {
            handle.openFile(node.fullPath);
          }
        }
        // TODO: How to combine to useKeybindOfCommand? and useHotkey?
      },
    }),
  });

  return <MaterialReactTable table={table} />;
}
