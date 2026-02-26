import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface ValidationResult {
    totalItems: number;
    properlyDocumented: string[];
    missing: string[];
    incorrectlyPlaced: Array<{ item: string, foundIn: string[] }>;
    coverage: number;
}

export class DocValidator {
    public async validate(workspaceFolder: vscode.WorkspaceFolder): Promise<ValidationResult> {
        const rootPath = workspaceFolder.uri.fsPath;
        const docPath = path.join(rootPath, 'Documentation');

        if (!fs.existsSync(docPath)) {
            vscode.window.showWarningMessage('EvoDoc: Documentation folder not found. Please generate documentation first.');
            return { totalItems: 0, properlyDocumented: [], missing: [], incorrectlyPlaced: [], coverage: 0 };
        }

        const sourceItemsSet = await this.extractSourceItems(rootPath);
        const sourceItems = Array.from(sourceItemsSet);

        // Re-parse all Markdown files cleanly on every execution
        const docFileItems = await this.extractDocItemsByFile(docPath, sourceItems);

        // API_Documentation.md is the designated file for functions and classes
        const apiDocItems = docFileItems['API_Documentation.md'] || new Set<string>();

        const properlyDocumented: string[] = [];
        const missing: string[] = [];
        const incorrectlyPlaced: Array<{ item: string, foundIn: string[] }> = [];

        for (const item of sourceItems) {
            // Check if item is correctly placed in API_Documentation.md
            if (apiDocItems.has(item)) {
                properlyDocumented.push(item);
            } else {
                // Determine if it was incorrectly placed in a different file
                const foundInFiles: string[] = [];
                for (const [fileName, items] of Object.entries(docFileItems)) {
                    if (fileName !== 'API_Documentation.md' && items.has(item)) {
                        foundInFiles.push(fileName);
                    }
                }

                if (foundInFiles.length > 0) {
                    incorrectlyPlaced.push({ item, foundIn: foundInFiles });
                    missing.push(item); // Missing from the required API Doc
                } else {
                    missing.push(item); // Completely missing everywhere
                }
            }
        }

        const totalItems = sourceItems.length;
        const coverage = totalItems === 0 ? 100 : Math.round((properlyDocumented.length / totalItems) * 100);

        this.generateReport(docPath, totalItems, properlyDocumented, missing, incorrectlyPlaced, coverage);

        return { totalItems, properlyDocumented, missing, incorrectlyPlaced, coverage };
    }

    private async extractSourceItems(rootPath: string): Promise<Set<string>> {
        const allowedExtensions = ['.ts', '.js', '.py', '.java', '.cs', '.go', '.cpp', '.h', '.jsx', '.tsx'];
        const excludeDirs = ['node_modules', '.git', 'out', 'dist', 'build', '.vscode', 'Documentation'];
        const items = new Set<string>();

        const walk = (dir: string) => {
            if (!fs.existsSync(dir)) return;
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
                        const content = fs.readFileSync(filePath, 'utf-8');

                        // Extract classes
                        const classRegex = /class\s+([a-zA-Z0-9_]+)/g;
                        let match;
                        while ((match = classRegex.exec(content)) !== null) {
                            items.add(match[1]);
                        }

                        // Extract top-level functions (supports JS/TS and Python's def)
                        const functionRegex = /(?:function|const|let|def)\s+([a-zA-Z0-9_]+)\s*=?\s*(?:\([^)]*\))?(?:\s*->\s*[a-zA-Z__\[\]\s,]+)?\s*(?:=>|{|:)/g;
                        while ((match = functionRegex.exec(content)) !== null) {
                            if (!['if', 'for', 'while', 'switch', 'catch', 'import', 'require', 'export'].includes(match[1])) {
                                items.add(match[1]);
                            }
                        }

                        // Extract class methods in TypeScript (public/private/protected async? name(...) {)
                        // Simplified to match standard method signatures
                        const methodRegex = /(?:public|private|protected)\s+(?:async\s+)?(?:static\s+)?([a-zA-Z0-9_]+)\s*\(/g;
                        while ((match = methodRegex.exec(content)) !== null) {
                            if (!['constructor', 'catch', 'if', 'for', 'while', 'switch'].includes(match[1])) {
                                items.add(match[1]);
                            }
                        }
                    }
                }
            }
        };

        walk(rootPath);
        return items;
    }

    private async extractDocItemsByFile(docPath: string, sourceItems: string[]): Promise<Record<string, Set<string>>> {
        const fileItems: Record<string, Set<string>> = {};

        const walk = (dir: string) => {
            if (!fs.existsSync(dir)) return;
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);

                if (stat.isDirectory()) {
                    walk(filePath);
                } else {
                    if (path.extname(file) === '.md') {
                        const content = fs.readFileSync(filePath, 'utf-8');
                        const items = new Set<string>();

                        // We strictly only count an item if it has its own dedicated markdown header!
                        // Casual mentions in bullet lists or text do not count as proper documentation.
                        for (const item of sourceItems) {
                            // Escape item to be perfectly safe in regex
                            const escapedItem = item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                            // Matches headers like: "## MyFunction(args)" or "### **MyFunction**"
                            const headingRegex = new RegExp(`^#+\\s+(?:Class|Function|Interface|Method)?\\s*[\`*_]*${escapedItem}[\`*_]*(?:\\(|\\s|$)`, 'im');

                            if (headingRegex.test(content)) {
                                items.add(item);
                            }
                        }

                        fileItems[file] = items;
                    }
                }
            }
        };

        walk(docPath);
        return fileItems;
    }

    private generateReport(
        docPath: string,
        totalItems: number,
        properlyDocumented: string[],
        missing: string[],
        incorrectlyPlaced: Array<{ item: string, foundIn: string[] }>,
        coverage: number
    ) {
        const reportPath = path.join(docPath, 'Validation_Report.md');
        let content = `# Strict Documentation Validation Report\n\n`;
        content += `**Coverage Score:** ${coverage}%\n\n`;
        content += `- **Total Code Items (Classes/Functions):** ${totalItems}\n`;
        content += `- **Properly Documented (in API_Documentation.md):** ${properlyDocumented.length}\n`;
        content += `- **Missing Items:** ${missing.length}\n`;
        content += `- **Incorrectly Placed Items:** ${incorrectlyPlaced.length}\n\n`;

        content += `## Properly Documented Items\n`;
        if (properlyDocumented.length === 0) {
            content += `- None!\n\n`;
        } else {
            properlyDocumented.forEach(item => {
                content += `- \`${item}\`\n`;
            });
            content += `\n`;
        }

        content += `## Incorrectly Placed Items\n`;
        content += `The following items were found in the codebase and in the broader documentation, but **not** in their required \`API_Documentation.md\` file:\n\n`;
        if (incorrectlyPlaced.length === 0) {
            content += `- None!\n\n`;
        } else {
            incorrectlyPlaced.forEach(entry => {
                content += `- \`${entry.item}\` (Found in: ${entry.foundIn.map(f => `\`${f}\``).join(', ')})\n`;
            });
            content += `\n`;
        }

        content += `## Completely Missing Items\n`;
        content += `The following functions or classes were found in the source code but are missing from all documentation:\n\n`;
        const completelyMissing = missing.filter(m => !incorrectlyPlaced.some(ip => ip.item === m));
        if (completelyMissing.length === 0) {
            content += `- None!\n\n`;
        } else {
            completelyMissing.forEach(item => {
                content += `- \`${item}\`\n`;
            });
            content += `\n`;
        }

        fs.writeFileSync(reportPath, content, 'utf-8');
    }
}
