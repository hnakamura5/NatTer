import { log } from "@/datatypes/Logger";
import { CallbackManager, Encoder } from "./utility";
import { IChildShell, ChildShellStreamOptions } from "./interface";
import { Client, ClientChannel, ConnectConfig, PseudoTtyOptions } from "ssh2";

export class SshConnectorBase extends CallbackManager implements IChildShell {
  protected client: Client;
  protected stream?: ClientChannel;
  protected newline: string;
  protected encoder: Encoder;

  protected connectPromise: Promise<void>;
  protected error: Error | undefined;
  protected killSignal?: NodeJS.Signals;

  constructor(
    protected connectConfig: ConnectConfig,
    private window: PseudoTtyOptions | false,
    protected options?: ChildShellStreamOptions
  ) {
    super();
    this.client = new Client();
    this.encoder = new Encoder(options?.encoding);
    this.newline = options?.newline || "\n";
    this.connectPromise = new Promise<void>((resolve, reject) => {
      this.client
        .on("ready", () => {
          log.debug("SSH client is ready: ", this.connectConfig);
          this.client.shell(
            window,
            {
              env: this.options?.env,
            },
            (err, stream) => {
              stream.on("close", () => {
                log.debug("onClose");
                this.client.end();
              });
              stream.stdout.on("data", (data: Buffer) => {
                log.debug("onData: ", data);
                const decoded = this.encoder.decode(data);
                this.stdoutCall(decoded);
              });
              stream.stderr.on("data", (data: Buffer) => {
                log.debug("onData: ", data);
                const decoded = this.encoder.decode(data);
                this.stderrCall(decoded);
              });
              this.stream = stream;
              this.error = err;
              resolve();
            }
          );
        })
        .on("error", (err) => {
          reject();
          this.error = err;
          log.debug("SSH client error: ", err);
          // TODO: reconnection with timeout?
        })
        .on("close", () => {
          log.debug("SSH client is closed");
          this.exitCall(this.error ? 1 : 0);
        });
    });
  }

  start() {
    // We have to separate the connection to the server in order to
    // give the chance to the client to register the event handlers.
    this.client.connect(this.connectConfig);
    // Wait for the client to be ready.
    return this.connectPromise;
  }

  write(data: string) {
    this.start().then(() => {
      this.stream?.write(this.encoder.encode(data));
    });
  }

  execute(command: string) {
    this.start().then(() => {
      this.stream?.write(this.encoder.encode(command + this.newline));
    });
  }

  kill(signal?: NodeJS.Signals) {
    this.killSignal = signal;
    this.client.end();
  }
}
