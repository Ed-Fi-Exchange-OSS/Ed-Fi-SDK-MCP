# Create an MCP Server

## User Story

As a programmer using an AI assistant like GitHub Copilot, Claude Code, Cursor, etc, I want an MCP server that helps me build client applications that interact with an Ed-Fi API.

## Workflow

* It should prompt me for the Data Standard version that I want to use.
* Based on the Data Standard version, it should read the Open API specification from a URL based on the following table:

  | Data Standard Version | URL                                                                                                             |
  | ------------------------ | ------------------------------------------------------------------------------- |
  | 4.0                                | https://api.ed-fi.org/v6.2/api/metadata/data/v3/resources/swagger.json |
  | 5.0                                | https://api.ed-fi.org/v7.1/api/metadata/data/v3/resources/swagger.json |
  | 5.1                                | https://api.ed-fi.org/v7.2/api/metadata/data/v3/resources/swagger.json |
  | 5.2                                | https://api.ed-fi.org/v7.3/api/metadata/data/v3/resources/swagger.json |

* As I ask questions, it should read the Open API specification and help me find the matching API endpoint and data model that I need to use.

## Acceptance Criteria

* MCP server written in Typescript
* Assume the Open API specification file is in JSON
