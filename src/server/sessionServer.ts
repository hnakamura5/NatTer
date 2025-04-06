import { z } from "zod";
import { randomUUID } from "node:crypto";
import { SessionID, SessionIDSchema } from "@/datatypes/SessionID";

import { server } from "@/server/tRPCServer";
import { title } from "node:process";
import {
  newSessionAttribute,
  SessionAttribute,
} from "./types/SessionAttribute";
import { log } from "@/datatypes/Logger";
import { newUUID } from "./cryptoServer";

const existSessionID: Set<SessionID["id"]> = new Set();
export function newSession(): SessionID {
  const id = newUUID();
  existSessionID.add(id);
  return { type: "session", id };
}
export function assertSessionExists(sessionID: SessionID) {
  if (!existSessionID.has(sessionID.id)) {
    log.debug(`Session ${sessionID} does not exists.`);
    throw new Error("Fatal error: Session safety violation.");
  }
}

const Attributes = new Map<SessionID, SessionAttribute>();
function getAttribute(sessionID: SessionID): SessionAttribute {
  const result = Attributes.get(sessionID);
  if (result === undefined) {
    const message = `Session ${sessionID} not found.`;
    log.error(message);
    throw new Error(message);
  }
  return result;
}

const proc = server.procedure;
// Provides the session ID. It is used to identify the session in the client.
// The session is sandbox environment in this application, ID is the unique key.
// Who knows session ID only can access the information associated with the session.
export const sessionRouter = server.router({
  newSession: proc
    .input(z.object({ title: z.string() }))
    .output(SessionIDSchema)
    .mutation(async () => {
      const sessionID = newSession();
      Attributes.set(sessionID, newSessionAttribute(sessionID.id, title));
      return sessionID;
    }),

  // The existence query is NOT provided to the client.

  title: proc
    .input(SessionIDSchema)
    .output(z.string())
    .mutation(async ({ input }) => {
      return getAttribute(input).title;
    }),
});
