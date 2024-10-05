import { api } from "@/api";
import ProcessAccordion from "@/components/Session/ProcessAccordion";
import { ProcessID } from "@/server/ShellProcess";
import { Box } from "@mui/material";
import { ErrorBoundary } from "react-error-boundary";

interface SessionProps {
  pid: ProcessID;
}

function Session(props: SessionProps) {
  // TODO: Placeholder for now.
  const commands = api.shell.commands.useQuery(props.pid, {
    onError: (error) => {
      console.log(`commands fetch: ${error}`);
    },
    refetchInterval: 200,
  });
  if (!commands.data) {
    return <Box>Loading...</Box>;
  }
  const processAccordions = commands.data.map((command, index) => {
    console.log(`command: ${command.command} key: ${index}`);
    return (
      <ProcessAccordion
        command={command}
        key={command.clock}
        listIndex={index}
      />
    );
  });

  return (
    <ErrorBoundary
      fallbackRender={() => {
        return <Box>Session load error.</Box>;
      }}
    >
      <Box
      sx = {{
        maxHeight: "calc(100vh - 100px)",
        overflow: "auto",
      }}
      >{processAccordions}</Box>
    </ErrorBoundary>
  );
}

export default Session;
