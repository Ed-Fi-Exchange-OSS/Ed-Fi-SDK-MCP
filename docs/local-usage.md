# Local Usage

These instructions will help you test out the MCP server running from source code.

## Install and Build

```bash
npm install
```

## Run Locally

> [!NOTE]
> This isn't very useful by itself. You can't directly interact with this without another tool, but you _can_ confirm that the process starts up.

Either build and run

```bash
npm run build
npm start
```

Or execute with `tsx`.

```bash
npm run dev
```

## Integrate Into GitHub Copilot in VS Code

> [!NOTE]
> This should work with other tools as well, but has only been tested in VS Code.

The `dev` command is loaded into the `.vscode/mcp.json` file, which will load the chat agent within this workspace.

Open the Copilot Chat. Click on the Tools button and confirm that the `ed-fi-sdk-mcp` is loaded. Try a command such as:

```shell
set_data_standard_version 5.2
```

Then try

```shell
search_endpoints health
```

Just for fun, change the Data Standard to 4.0 and try that health query again. Since it was added in Data Standard 5, the agent should not be able to find anything.
