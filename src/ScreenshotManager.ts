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
            const baseScreenshotName = fileName.replace(/\.[^/.]+$/, "");

            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                throw new Error('No workspace folder found');
            }

            const rootPath = workspaceFolders[0].uri.fsPath;
            const frontendDocPath = path.join(rootPath, 'Documentation', 'Front_end');

            if (!fs.existsSync(frontendDocPath)) {
                fs.mkdirSync(frontendDocPath, { recursive: true });
            }

            const browser = await this.getBrowser();
            const page = await browser.newPage();

            const fileUrl = `file://${filePath}`;
            await page.goto(fileUrl, { waitUntil: 'networkidle0' });

            const supportsDarkMode = await page.evaluate(() => {

                const styles = Array.from(document.querySelectorAll('style'));
                for (const style of styles) {
                    const content = style.textContent;
                    if (content && (content.includes('prefers-color-scheme: dark') || content.includes('.dark') || content.includes('[data-theme="dark"]'))) {
                        return true;
                    }
                }

                for (let i = 0; i < document.styleSheets.length; i++) {
                    try {
                        const styleSheet = document.styleSheets[i];
                        if (styleSheet.cssRules) {
                            for (let j = 0; j < styleSheet.cssRules.length; j++) {
                                const rule = styleSheet.cssRules[j];
                                // @ts-ignore
                                if (rule.conditionText && rule.conditionText.includes('prefers-color-scheme: dark')) {
                                    return true;
                                }
                                // @ts-ignore
                                if (rule.selectorText && (rule.selectorText.includes('.dark') || rule.selectorText.includes('[data-theme="dark"]'))) {
                                    return true;
                                }
                            }
                        }
                    } catch (e) {

                    }
                }

                return false;
            });

            const viewports = [
                { name: 'Desktop', width: 1280, height: 800 },
                { name: 'Tablet', width: 768, height: 1024 },
                { name: 'Mobile', width: 500, height: 812 }
            ];

            const themes: ('light' | 'dark')[] = ['light', 'dark'];

            for (const viewport of viewports) {

                const deviceDocPath = path.join(frontendDocPath, viewport.name);
                if (!fs.existsSync(deviceDocPath)) {
                    fs.mkdirSync(deviceDocPath, { recursive: true });
                }

                await page.setViewport({ width: viewport.width, height: viewport.height });

                for (const theme of themes) {
                    if (theme === 'dark' && !supportsDarkMode) {
                        console.log(`EvoDoc: Skipping dark mode capture for ${fileName} as it does not appear to support it.`);
                        continue;
                    }

                    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);

                    if (theme === 'dark') {
                        await page.evaluate(() => {
                            document.documentElement.classList.add('dark');
                            document.documentElement.setAttribute('data-theme', 'dark');
                            document.body.classList.add('dark');
                        });
                    } else {
                        await page.evaluate(() => {
                            document.documentElement.classList.remove('dark');
                            document.documentElement.removeAttribute('data-theme');
                            document.body.classList.remove('dark');
                        });
                    }

                    await new Promise(resolve => setTimeout(resolve, 500));

                    const screenshotName = `${baseScreenshotName}_${theme}.png`;
                    const savePath = path.join(deviceDocPath, screenshotName);

                    await page.screenshot({ path: savePath, fullPage: true });
                    console.log(`EvoDoc: Screenshot saved to ${savePath}`);
                }
            }

            vscode.window.showInformationMessage(`EvoDoc: Captured screenshots for ${fileName}`);

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
