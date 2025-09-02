# Prompt 4: GitHub Copilot Instructions and Workflows

## Original Problem Statement

1. [ ] Review this repository and write a draft `copilot-instructions.md` file in the `.github` folder.
   - Include this instructions: "All GitHub workflow action links must include the full commit hash instead of the version number."
3. [ ] Create a `.github/workflows/scorecard.yml` file by copying `https://raw.githubusercontent.com/Ed-Fi-Alliance-OSS/AdminAPI-2.x/refs/heads/main/.github/workflows/scorecard.yml` Make no other modifications to the file.
4. [ ] Create a `.github/workflows/on-pullrequest.yml` file with the following information:   
   - trigger on pull request to the `main` branch
   - Set `permissions: read-all`
   - Create these jobs
     -  `scan-actions-bidi`:

        ```yaml
        - scan-actions-bidi:
          name: Scan Actions, scan all files for BIDI Trojan Attacks
          uses: ed-fi-alliance-oss/ed-fi-actions/.github/workflows/repository-scanner.yml@main
        ```

     -  `build` with these steps:
        - checkout the repository
        - Setup node.js 22 with package caching
        - Call `npm run build` to make sure the pull request builds properly

5. [ ] Save the prompt above in a new `docs/prompt-?.md` file, replacing `?` with the next logical file number.

## Implementation Notes

This prompt was implemented to set up GitHub Copilot instructions and essential workflows for the Ed-Fi Data Standard MCP Server repository. The implementation includes:

- GitHub Copilot instructions with security requirements for workflow actions
- OpenSSF Scorecard workflow for supply-chain security scanning  
- Pull request workflow with BIDI attack scanning and build verification

All workflow files follow security best practices by using commit hashes instead of version tags where possible.