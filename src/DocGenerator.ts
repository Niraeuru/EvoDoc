import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { GroqService } from './GroqService';

export class DocGenerator {
    private groqService: GroqService;

    constructor(groqService: GroqService) {
        this.groqService = groqService;
    }

    public async generateDocumentation(workspaceFolder: vscode.WorkspaceFolder) {
        const docPath = path.join(workspaceFolder.uri.fsPath, 'Documentation');

        if (!fs.existsSync(docPath)) {
            fs.mkdirSync(docPath);
        }

        const sourceCode = await this.collectSourceCode(workspaceFolder.uri.fsPath);

        if (sourceCode.length === 0) {
            return; 
        }

        vscode.window.showInformationMessage('EvoDoc: Generating Documentation... This may take a moment.');

        try {
            await Promise.all([
                this.generateReadme(docPath, sourceCode),
                this.generateArchitecture(docPath, sourceCode),
                this.generateApiDoc(docPath, sourceCode),
                this.generateModuleDesc(docPath, sourceCode),
                this.generateChangeLog(docPath, sourceCode) 
            ]);

            vscode.window.showInformationMessage('EvoDoc: Documentation Generated Successfully!');
        } catch (error: any) {
            vscode.window.showErrorMessage(`EvoDoc: Failed to generate documentation. ${error.message}`);
        }
    }

    private async collectSourceCode(rootPath: string): Promise<string> {

        const allowedExtensions = ['.ts', '.js', '.py', '.java', '.cs', '.go', '.cpp', '.h'];
        const excludeDirs = ['node_modules', '.git', 'out', 'dist', 'build', '.vscode', 'Documentation'];

        let content = '';

        const walk = (dir: string) => {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);

                if (stat.isDirectory()) {
                    if (!excludeDirs.includes(file)) {
                        walk(filePath);
                    }
                } else {
                    if (allowedExtensions.includes(path.extname(file))) {

                        const fileContent = fs.readFileSync(filePath, 'utf-8');
                        if (fileContent.length < 20000) {
                            content += `\n\n--- File: ${path.relative(rootPath, filePath)} ---\n${fileContent}`;
                        }
                    }
                }
            }
        };

        walk(rootPath);
        return content;
    }

    private async generateReadme(docPath: string, codeContext: string) {
        const prompt = `
        Role: Expert Technical Writer
        Task: Generate a professional README.md for the following codebase.
        Content: Project Overview, Features, Getting Started, and Usage.
        Style: Enterprise Standard.
        Code Context:
        ${codeContext.substring(0, 30000)} // Limit context
        `;
        const content = await this.groqService.generateContent(prompt);
        fs.writeFileSync(path.join(docPath, 'README.md'), content);
    }

    private async generateArchitecture(docPath: string, codeContext: string) {
        const prompt = `
        Role: System Architect
        Task: Generate an Architecture.md file describing the system design, components, and data flow.
        Content: High-level diagram (mermaid if possible), Component descriptions.
        Style: Enterprise Standard.
        Code Context:
        ${codeContext.substring(0, 30000)}
        `;
        const content = await this.groqService.generateContent(prompt);
        fs.writeFileSync(path.join(docPath, 'Architecture.md'), content);
    }

    private async generateApiDoc(docPath: string, codeContext: string) {
        const prompt = `
        Role: Senior Developer
        Task: Generate an API_Documentation.md listing key functions, classes, and interfaces.
        Content: Signatures, parameters, return values.
        Style: Technical and precise.
        Code Context:
        ${codeContext.substring(0, 30000)}
        `;
        const content = await this.groqService.generateContent(prompt);
        fs.writeFileSync(path.join(docPath, 'API_Documentation.md'), content);
    }

    private async generateModuleDesc(docPath: string, codeContext: string) {
        const prompt = `
        Role: Technical Writer
        Task: Generate Module_Descriptions.md explaining the purpose of each major module/file.
        Content: Module name, Purpose, Dependencies.
        Code Context:
        ${codeContext.substring(0, 30000)}
        `;
        const content = await this.groqService.generateContent(prompt);
        fs.writeFileSync(path.join(docPath, 'Module_Descriptions.md'), content);
    }

    private async generateChangeLog(docPath: string, codeContext: string) {
        const filePath = path.join(docPath, 'Change_Log.md');
        let prompt = '';

        if (fs.existsSync(filePath)) {
            prompt = `
             Role: Technical Writer
             Task: Appending to Change Log. Since this is an automated regeneration, just summarize the current state.
             Context:
             ${codeContext.substring(0, 10000)}
             `;
        } else {
            prompt = `
             Role: Technical Writer
             Task: Create an initial Change_Log.md.
             Entries: Initial documentation generation.
             `; 
        }

        const content = await this.groqService.generateContent(prompt);
        fs.writeFileSync(filePath, content);
    }
}
