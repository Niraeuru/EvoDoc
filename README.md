# EvoDoc

An Evolving Documentation System for automatic documentation generation and validation in VS Code.

## Features

- **Automatic Documentation Generation**: Generate comprehensive documentation for your codebase using AI.
- **Documentation Validation**: Automatically validate your documentation to ensure coverage and accuracy against your source code.
- **Frontend Screenshot Management**: Capture and update responsive screenshots (Desktop, Tablet, Mobile) of your frontend UI directly from your editor.
- **Watch Mode**: Automatically update documentation when files are saved (with configurable thresholds).

## Requirements

- VS Code version `1.85.0` or higher.

## Extension Settings

This extension contributes the following settings:

* `evodoc.enableOnSave`: Automatically update documentation when files are saved (default: `true`).
* `evodoc.changeThreshold`: Number of lines changed before triggering an update on save (default: `50`).

## Commands

- `EvoDoc: Toggle Active State`: Turn the extension on or off.
- `EvoDoc: Generate Documentation`: Manually trigger documentation generation.
- `EvoDoc: Update Frontend Screenshots`: Capture and save frontend UI screenshots across different device sizes.
- `EvoDoc: Validate Documentation`: Run the validation process to check documentation coverage.

## Usage

1. Open the EvoDoc menu from the VS Code Activity Bar.
2. Configure your API keys and desired settings.
3. Use the sidebar buttons or the command palette to generate docs, validate them, or take screenshots!

## Scripts provided

- `npm run compile`: Compiles the extension.
- `npm run watch`: Compiles the extension and watches for modifications.
- `npm run lint`: Analyzes the code using ESLint.
- `npm run test`: Runs the test suite.
