import * as vscode from 'vscode';
import { EvoDocProvider } from './EvoDocProvider';
import { GroqService } from './GroqService';
import { DocGenerator } from './DocGenerator';
import { ChangeTracker } from './ChangeTracker';
import { ScreenshotManager } from './ScreenshotManager';
import { FrontendWatcher } from './FrontendWatcher';
import { ExportService } from './ExportService';

export function activate(context: vscode.ExtensionContext) {
    console.log('EvoDoc is now active!');

    // Initialize Services
    const groqService = new GroqService();
    const docGenerator = new DocGenerator(groqService);
    const changeTracker = new ChangeTracker();
    const screenshotManager = new ScreenshotManager();
    const exportService = new ExportService();
    // Watcher is initialized but we might want to only enable it when isEnabled is true
    // However, the requirement says "The module should only operate when EvoDoc is enabled"
    // So we'll manage the watcher subscription dynamically or check the flag inside.
    let frontendWatcher: FrontendWatcher | undefined;

    let isEnabled = false;

    // Sidebar Provider
    const sidebarProvider = new EvoDocProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(EvoDocProvider.viewType, sidebarProvider)
    );

    // Command: Toggle
    context.subscriptions.push(
        vscode.commands.registerCommand('evodoc.toggle', (value?: boolean) => {
            if (value === undefined) {
                isEnabled = !isEnabled;
            } else {
                isEnabled = value;
            }

            sidebarProvider.updateStatus(isEnabled);

            if (isEnabled) {
                vscode.window.showInformationMessage('EvoDoc: Activated');
                // Activate Frontend Watcher
                if (!frontendWatcher) {
                    frontendWatcher = new FrontendWatcher(screenshotManager);
                }
            } else {
                vscode.window.showInformationMessage('EvoDoc: Deactivated');
                // Deactivate Frontend Watcher
                if (frontendWatcher) {
                    frontendWatcher.dispose();
                    frontendWatcher = undefined;
                }
            }
        })
    );

    // Command: Generate Documentation
    context.subscriptions.push(
        vscode.commands.registerCommand('evodoc.generate', async () => {


            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                vscode.window.showErrorMessage('EvoDoc: No workspace open.');
                return;
            }

            // Generate for the first workspace folder for now
            await docGenerator.generateDocumentation(workspaceFolders[0]);
        })
    );

    // Command: Export Documentation
    context.subscriptions.push(
        vscode.commands.registerCommand('evodoc.exportDocs', async () => {
            await exportService.exportDocumentation();
        })
    );

    // Command: Update Frontend Screenshots
    context.subscriptions.push(
        vscode.commands.registerCommand('evodoc.updateScreenshots', async () => {
            vscode.window.showInformationMessage('EvoDoc: Updating all frontend screenshots...');
            // Logic to find all frontend files and screenshot them
            // This is a bit heavy, maybe just a message for now or implement a scan
            // For this MVP, let's just show a notification or maybe trigger on the current file?

            // Better: Let's iterate workspace files and capture.
            const files = await vscode.workspace.findFiles('**/*.{html,css,js,ts,jsx,tsx}', '**/node_modules/**');
            for (const file of files) {
                if (!file.fsPath.includes('Documentation')) {
                    await screenshotManager.captureScreenshot(file.fsPath);
                }
            }
            vscode.window.showInformationMessage(`EvoDoc: Finished updating ${files.length} screenshots.`);
        })
    );

    // Event: On Text Change
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument((event) => {
            if (isEnabled && event.contentChanges.length > 0) {
                // Skip documentation files
                if (event.document.uri.fsPath.includes('Documentation')) {
                    return;
                }
                changeTracker.trackChange(event);
            }
        })
    );

    // Event: On Workspace Save
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument(async (document) => {
            if (isEnabled) {
                const config = vscode.workspace.getConfiguration('evodoc');
                const enableOnSave = config.get<boolean>('enableOnSave');
                const changeThreshold = config.get<number>('changeThreshold') || 50;

                if (enableOnSave) {
                    // Avoid triggering on Documentation files to prevent loops
                    if (document.uri.fsPath.includes('Documentation')) {
                        return;
                    }

                    console.log(`EvoDoc: File saved. Change count: ${changeTracker.changedLinesCount} / ${changeThreshold}`);

                    if (changeTracker.changedLinesCount >= changeThreshold) {
                        console.log('EvoDoc: Threshold met, triggering generation...');
                        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
                        if (workspaceFolder) {
                            vscode.window.showInformationMessage(`EvoDoc: Change threshold (${changeTracker.changedLinesCount}/${changeThreshold}) met. Updating docs...`);
                            await docGenerator.generateDocumentation(workspaceFolder);
                            changeTracker.reset();
                        }
                    } else {
                        console.log('EvoDoc: Threshold not met. Skipping generation.');
                    }
                }
            }
        })
    );


}

export function deactivate() {
}
