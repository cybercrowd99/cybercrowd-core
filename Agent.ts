// cybercrowd-core/Agent.ts

import { ProviderRouter } from "./providers/router";
import { ModelSession } from "./session";
import { IsolatorShield } from "./shield";
import { FileTool } from "./tools/file";
import { ShellTool } from "./tools/shell";

export class Agent {
  private router: ProviderRouter;
  private session: ModelSession;
  private tools: Record<string, any>;
  private shield: IsolatorShield;

  constructor() {
    this.router = new ProviderRouter();
    this.session = new ModelSession();

    this.tools = {
      file: new FileTool(),
      shell: new ShellTool()
    };

    this.shield = new IsolatorShield(this.tools);
  }

  async run(prompt: string) {
    this.session.add({ role: "user", content: prompt });

    const model = this.router.getActiveModel();
    const response = await model.generate({
      prompt,
      session: this.session.getHistory()
    });

    const text =
      response?.text ??
      response?.message ??
      response?.output ??
      response?.choices?.[0]?.message?.content ??
      "";

    this.session.add({ role: "assistant", content: text });

    return text;
  }

  async callTool(name: string, args: any) {
    return this.shield.execute(name, args);
  }
}
