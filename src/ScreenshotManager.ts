import * as vscode from 'vscode';
import * as puppeteer from 'puppeteer';
import * as path from 'path';
import * as fs from 'fs';

export class ScreenshotManager {
    private browser: puppeteer.Browser | null = null;
    private isCapturing = false;

    constructor() {
        this.ensureDocumentationFolder();
    }

    private ensureDocumentationFolder() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) { return; }

        const rootPath = workspaceFolders[0].uri.fsPath;
        const docPath = path.join(rootPath, 'Documentation');
        const frontendPath = path.join(docPath, 'Front_end');

        if (!fs.existsSync(docPath)) {
            fs.mkdirSync(docPath);
        }
        if (!fs.existsSync(frontendPath)) {
            fs.mkdirSync(frontendPath);
        }
    }

    private async getBrowser(): Promise<puppeteer.Browser> {
        if (!this.browser) {
            this.browser = await puppeteer.launch({
                headless: true
            });
        }
        return this.browser;
    }


    public async captureScreenshot(filePath: string) {
        // Enforce HTML only
        if (path.extname(filePath).toLowerCase() !== '.html') {
            console.log(`EvoDoc: Skipping screenshot for non-HTML file: ${filePath}`);
            return;
        }

        if (this.isCapturing) {
            console.log('EvoDoc: Screenshot capture already in progress. Skipping.');
            return;
        }

        this.isCapturing = true;

        try {
            const fileName = path.basename(filePath);
           
            const screenshotName = fileName.replace(/\.[^/.]+$/, "") + ".png";

            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                throw new Error('No workspace folder found');
            }

            const rootPath = workspaceFolders[0].uri.fsPath;
            const frontendDocPath = path.join(rootPath, 'Documentation', 'Front_end');
            const savePath = path.join(frontendDocPath, screenshotName);

            // Ensure folder exists just in case
            if (!fs.existsSync(frontendDocPath)) {
                fs.mkdirSync(frontendDocPath, { recursive: true });
            }

            const browser = await this.getBrowser();
            const page = await browser.newPage();

            // Set a reasonable viewport
            await page.setViewport({ width: 1280, height: 800 });

            // File URL for local files
            const fileUrl = `file://${filePath}`;
            await page.goto(fileUrl, { waitUntil: 'networkidle0' });

            // Capture screenshot
            await page.screenshot({ path: savePath, fullPage: true });

            console.log(`EvoDoc: Screenshot saved to ${savePath}`);
            vscode.window.showInformationMessage(`EvoDoc: Updated screenshot for ${fileName}`);

            await page.close();

        } catch (error) {
            console.error('EvoDoc: Error capturing screenshot:', error);
            vscode.window.showErrorMessage(`EvoDoc: Failed to capture screenshot. ${error}`);
        } finally {
            this.isCapturing = false;
        }
    }

    public async dispose() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}
