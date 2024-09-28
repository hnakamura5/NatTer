import { api } from "@/api";
import ProcessAccordion from "@/components/Session/ProcessAccordion";
import { ProcessID } from "@/server/ShellProcess";
import { Box } from "@mui/material";

interface SessionProps {
  pid: ProcessID;
}

function Session(props: SessionProps) {
  // TODO: Placeholder for now.
  const commands = api.shell.commands.useQuery(props.pid);
  if (!commands.data) {
    return <Box>Loading...</Box>;
  }
  const processAccordions = commands.data.map((item) => (
    <ProcessAccordion command={item} />
  ));

  return <Box>{processAccordions}</Box>;
}

export default Session;
