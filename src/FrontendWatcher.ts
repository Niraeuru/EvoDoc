import * as vscode from 'vscode';
import { ScreenshotManager } from './ScreenshotManager';
import * as path from 'path';

export class FrontendWatcher {
    private watcher: vscode.FileSystemWatcher;
    private screenshotManager: ScreenshotManager;
    private disposables: vscode.Disposable[] = [];

    //Supported extensions
    private readonly validExtensions = ['.html', '.css', '.js', '.ts', '.jsx', '.tsx'];

    constructor(screenshotManager: ScreenshotManager) {
        this.screenshotManager = screenshotManager;

        const blobPattern = '**/*.{html,css,js,ts,jsx,tsx}';
        this.watcher = vscode.workspace.createFileSystemWatcher(blobPattern);

        this.setupListeners();
    }

    private setupListeners() {
        // On file change
        this.watcher.onDidChange(async (uri) => {
            if (!this.shouldProcessFile(uri)) { return; }

            const ext = path.extname(uri.fsPath).toLowerCase();

            if (ext === '.html') {
                console.log(`EvoDoc: Frontend file changed: ${uri.fsPath}`);
                await this.screenshotManager.captureScreenshot(uri.fsPath);
            } else {

                const dir = path.dirname(uri.fsPath);

                const fs = require('fs'); 
                const relativePattern = new vscode.RelativePattern(dir, '*.html');
                const htmlFiles = await vscode.workspace.findFiles(relativePattern);

                if (htmlFiles.length > 0) {
                    console.log(`EvoDoc: Asset changed (${path.basename(uri.fsPath)}). Updating ${htmlFiles.length} dependent HTML files.`);
                    for (const htmlFile of htmlFiles) {
                        await this.screenshotManager.captureScreenshot(htmlFile.fsPath);
                    }
                }
            }

        }, this, this.disposables);

    }

    private shouldProcessFile(uri: vscode.Uri): boolean {

        const fsPath = uri.fsPath;
        if (fsPath.includes('node_modules') || fsPath.includes('Documentation')) {
            return false;
        }

        const ext = path.extname(fsPath).toLowerCase();
        return this.validExtensions.includes(ext);
    }

    public dispose() {
        this.watcher.dispose();
        this.disposables.forEach(d => d.dispose());
    }
}
