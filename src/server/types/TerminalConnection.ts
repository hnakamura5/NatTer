import { randomUUID } from "node:crypto";
import { TerminalID } from "@/datatypes/Command";

const usedTerminalID: Set<TerminalID> = new Set();

export function newTerminalID(): TerminalID {
  let result = randomUUID();
  while (usedTerminalID.has(result)) {
    result = randomUUID();
  }
  usedTerminalID.add(result);
  return result;
}
