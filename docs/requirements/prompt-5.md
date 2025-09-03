# Refactor the domain handling and add a command line interface

> [!NOTE]
> Interactive coding session in local GitHub Copilot.

1. In the `Ed-Fi-Model` repository, ran something like this:

   > Extract domain information from .metaed files and creates a JSON document grouped by Domain name with documentation and entities.

2. Brought those JSON files into this repository and applied the following prompt to use them:

   > Refactor getEntitiesByDomain so that it
   >
   > 1. Accepts the Data Standard version as an argument
   > 2. Reads the domain information from the matching file in the domains directory.
   > 3. For example, if the version is "4.0" then read file domains/4.0.json. If the version number is unknown, then throw an error stating "Domain information is not available for this version."

3. Tweaked the results using:

   > Refactor the four files in the domain directory so that they are typescript files that return the domain information as a constant.

4. Created the CLI interface with:

   > create a command line interface, in javascript, that allows me to invoke the tools and prompts in index.ts