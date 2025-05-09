import { log } from "@/datatypes/Logger";
import { CallbackManager, Encoder } from "./utility";
import { IShell, ShellOptions } from "./interface";
import { Client, ClientChannel, ConnectConfig, PseudoTtyOptions } from "ssh2";

export class SshConnectorBase extends CallbackManager implements IShell {
  protected client: Client;
  protected stream?: ClientChannel;
  protected newline: string;
  protected encoder: Encoder;

  private started = false;
  protected connectPromise: Promise<void>;
  protected error: Error | undefined;
  protected killSignal?: NodeJS.Signals;

  constructor(
    protected connectConfig: ConnectConfig,
    private window: PseudoTtyOptions | false,
    protected options?: ShellOptions
  ) {
    super();
    this.client = new Client();
    this.encoder = new Encoder(options?.encoding);
    this.newline = options?.newline || "\n";
    log.debug("SSH client constructor: ", this.connectConfig);
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
                log.debug("SSH stdout onData: ", data.toString());
                const decoded = this.encoder.decode(data);
                this.stdoutCall(decoded);
              });
              stream.stderr.on("data", (data: Buffer) => {
                log.debug("SSH stderr onData: ", data.toString());
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
          log.debug("SSH client on error: ", err);
          this.error = err;
          reject();
          // TODO: reconnection with timeout?
        })
        .on("close", () => {
          log.debug("SSH client is closed");
          this.exitCall(this.error ? 1 : 0);
        });
    })
      .catch((err) => {
        this.error = err;
        log.debug("SSH client start error: ", err);
      })
      .finally(() => {
        log.debug("SSH client start finally");
      });
  }

  start() {
    if (!this.started) {
      this.started = true;
      log.debug("SSH client connect: ", this.connectConfig);
      // We have to separate the connection to the server in order to
      // give the chance to the client to register the event handlers.
      this.client.connect(this.connectConfig);
      // Wait for the client to be ready.
    }
    return this.connectPromise;
  }

  write(data: string) {
    this.start().then(() => {
      log.debug("SSH client write: ", data);
      this.stream?.write(this.encoder.encode(data));
    });
  }

  execute(command: string) {
    this.start().then(() => {
      log.debug("SSH client execute: ", command);
      this.stream?.write(this.encoder.encode(command + this.newline));
    });
  }

  kill(signal?: NodeJS.Signals) {
    log.debug("SSH client kill: ", signal);
    this.killSignal = signal;
    this.client.end();
  }
}
