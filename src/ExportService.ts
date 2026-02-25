import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import AdmZip = require('adm-zip');

export class ExportService {

    constructor() { }

    /**
     * Initiates the ZIP export process.
     */
    public async exportDocumentation() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('EvoDoc: No workspace open.');
            return;
        }

        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        const docsPath = path.join(workspaceRoot, 'Documentation');

        if (!fs.existsSync(docsPath)) {
            vscode.window.showWarningMessage('EvoDoc: Documentation folder not found. Please generate documentation first.');
            return;
        }

        try {
            await this.exportAsZip(docsPath, workspaceFolders[0].name);
        } catch (error: any) {
            vscode.window.showErrorMessage(`EvoDoc: Export failed. ${error.message}`);
        }
    }

    /**
     * Compresses the documentation folder into a ZIP file.
     */
    private async exportAsZip(sourcePath: string, projectName: string) {
        const date = new Date().toISOString().split('T')[0];
        const defaultFileName = `EvoDoc_${projectName}_${date}.zip`;

        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(path.join(path.dirname(sourcePath), defaultFileName)),
            filters: {
                'ZIP Archives': ['zip']
            },
            title: 'Save Documentation ZIP'
        });

        if (!uri) {
            return;
        }

        // Show progress indicator
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "EvoDoc: Exporting Documentation as ZIP",
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0, message: "Compressing files..." });

            return new Promise<void>((resolve, reject) => {
                try {
                    const zip = new AdmZip();
                    // Add the entire directory to the zip
                    zip.addLocalFolder(sourcePath);

                    zip.writeZip(uri.fsPath, (error: any) => {
                        if (error) {
                            reject(error);
                        } else {
                            vscode.window.showInformationMessage(`EvoDoc: Successfully exported documentation to ${uri.fsPath}`);
                            resolve();
                        }
                    });
                } catch (e) {
                    reject(e);
                }
            });
        });
    }
}
