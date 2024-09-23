import { OpaqueProcess } from "@/server/ShellProcess";

// Controls all the process information in the Session.

export class ProcessMaster {
  constructor(
    public process: OpaqueProcess,
    public shellComand: string,
    public shellArguments: string[]
  ) {}
}
