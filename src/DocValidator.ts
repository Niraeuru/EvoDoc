import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface DocItemQuality {
    exists: boolean;
    hasDescription: boolean;
    hasParameters: boolean;
    hasReturns: boolean;
    hasExample: boolean;
    score: number;
}

export interface SourceItem {
    name: string;
    type: 'class' | 'function' | 'method';
}

export interface ValidationResult {
    totalItems: number;
    properlyDocumented: { item: SourceItem, quality: DocItemQuality }[];
    missing: SourceItem[];
    incorrectlyPlaced: Array<{ item: SourceItem, foundIn: string[] }>;
    coverage: number;
    classCoverage: number;
    functionCoverage: number;
}

export class DocValidator {
    public async validate(workspaceFolder: vscode.WorkspaceFolder): Promise<ValidationResult> {
        const rootPath = workspaceFolder.uri.fsPath;
        const docPath = path.join(rootPath, 'Documentation');

        if (!fs.existsSync(docPath)) {
            vscode.window.showWarningMessage('EvoDoc: Documentation folder not found. Please generate documentation first.');
            return { totalItems: 0, properlyDocumented: [], missing: [], incorrectlyPlaced: [], coverage: 0, classCoverage: 0, functionCoverage: 0 };
        }

        const sourceItemsMap = await this.extractSourceItems(rootPath);
        const sourceItems = Array.from(sourceItemsMap.values());

        const docFileItems = await this.extractDocItemsByFile(docPath, sourceItems);
        const apiDocItems = docFileItems['API_Documentation.md'] || new Map<string, DocItemQuality>();

        const properlyDocumented: { item: SourceItem, quality: DocItemQuality }[] = [];
        const missing: SourceItem[] = [];
        const incorrectlyPlaced: Array<{ item: SourceItem, foundIn: string[] }> = [];

        let totalScore = 0;
        let classTotal = 0;
        let classScore = 0;
        let funcTotal = 0;
        let funcScore = 0;

        for (const item of sourceItems) {
            if (apiDocItems.has(item.name)) {
                const quality = apiDocItems.get(item.name)!;
                properlyDocumented.push({ item, quality });
                totalScore += quality.score;

                if (item.type === 'class') {
                    classTotal++;
                    classScore += quality.score;
                } else {
                    funcTotal++;
                    funcScore += quality.score;
                }
            } else {
                const foundInFiles: string[] = [];
                for (const [fileName, itemsMap] of Object.entries(docFileItems)) {
                    if (fileName !== 'API_Documentation.md' && itemsMap.has(item.name)) {
                        foundInFiles.push(fileName);
                    }
                }

                if (foundInFiles.length > 0) {
                    incorrectlyPlaced.push({ item, foundIn: foundInFiles });
                    // Partial credit 20%
                    totalScore += 20;
                    if (item.type === 'class') {
                        classTotal++;
                        classScore += 20;
                    } else {
                        funcTotal++;
                        funcScore += 20;
                    }
                } else {
                    missing.push(item);
                    if (item.type === 'class') {
                        classTotal++;
                    } else {
                        funcTotal++;
                    }
                }
            }
        }

        const totalItems = sourceItems.length;
        const coverage = totalItems === 0 ? 100 : Math.round(totalScore / totalItems);
        const classCoverage = classTotal === 0 ? 100 : Math.round(classScore / classTotal);
        const functionCoverage = funcTotal === 0 ? 100 : Math.round(funcScore / funcTotal);

        this.generateReport(docPath, totalItems, properlyDocumented, missing, incorrectlyPlaced, coverage, classCoverage, functionCoverage);

        return { totalItems, properlyDocumented, missing, incorrectlyPlaced, coverage, classCoverage, functionCoverage };
    }

    private async extractSourceItems(rootPath: string): Promise<Map<string, SourceItem>> {
        const allowedExtensions = ['.ts', '.js', '.py', '.java', '.cs', '.go', '.cpp', '.h', '.jsx', '.tsx'];
        const excludeDirs = ['node_modules', '.git', 'out', 'dist', 'build', '.vscode', 'Documentation'];
        const items = new Map<string, SourceItem>();

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

                        const classRegex = /class\s+([a-zA-Z0-9_]+)/g;
                        let match;
                        while ((match = classRegex.exec(content)) !== null) {
                            items.set(match[1], { name: match[1], type: 'class' });
                        }

                        const functionRegex = /(?:function|const|let|def)\s+([a-zA-Z0-9_]+)\s*=?\s*(?:\([^)]*\))?(?:\s*->\s*[a-zA-Z__\[\]\s,]+)?\s*(?:=>|{|:)/g;
                        while ((match = functionRegex.exec(content)) !== null) {
                            if (!['if', 'for', 'while', 'switch', 'catch', 'import', 'require', 'export'].includes(match[1])) {
                                items.set(match[1], { name: match[1], type: 'function' });
                            }
                        }

                        const methodRegex = /(?:public|private|protected)\s+(?:async\s+)?(?:static\s+)?([a-zA-Z0-9_]+)\s*\(/g;
                        while ((match = methodRegex.exec(content)) !== null) {
                            if (!['constructor', 'catch', 'if', 'for', 'while', 'switch'].includes(match[1])) {
                                items.set(match[1], { name: match[1], type: 'method' });
                            }
                        }
                    }
                }
            }
        };

        walk(rootPath);
        return items;
    }

    private async extractDocItemsByFile(docPath: string, sourceItems: SourceItem[]): Promise<Record<string, Map<string, DocItemQuality>>> {
        const fileItems: Record<string, Map<string, DocItemQuality>> = {};

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
                        const items = new Map<string, DocItemQuality>();

                        for (const item of sourceItems) {
                            const escapedItem = item.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                            const headingRegex = new RegExp(`(^#+\\s+(?:(?:Class|Function|Interface|Method)\\s*:?\\s*)?[\`*_]*${escapedItem}[\`*_]*(?:\\(|\\s|$))`, 'im');

                            const match = headingRegex.exec(content);
                            if (match) {
                                const indexStart = match.index + match[0].length;
                                const nextHeadingRegex = /^###\s+(?:Class|Function|Interface|Method)?\s*:?/mi;
                                const contentAfter = content.substring(indexStart);
                                const nextMatch = nextHeadingRegex.exec(contentAfter);
                                const sectionContent = nextMatch ? contentAfter.substring(0, nextMatch.index) : contentAfter;

                                const hasDescription = sectionContent.trim().length > 0 && !sectionContent.trim().startsWith('###') && !sectionContent.trim().startsWith('-');
                                const hasParameters = /#+\s*Parameters|[-*]\s*\*\*Parameters\*\*/i.test(sectionContent);
                                const hasReturns = /#+\s*Returns|[-*]\s*\*\*Returns\*\*/i.test(sectionContent);
                                const hasExample = /```[a-z]*[\s\S]*?```/i.test(sectionContent);

                                let score = 40;
                                if (hasDescription) score += 20;
                                if (hasParameters) score += 15;
                                if (hasReturns) score += 10;
                                if (hasExample) score += 15;

                                items.set(item.name, {
                                    exists: true,
                                    hasDescription,
                                    hasParameters,
                                    hasReturns,
                                    hasExample,
                                    score
                                });
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
        properlyDocumented: { item: SourceItem, quality: DocItemQuality }[],
        missing: SourceItem[],
        incorrectlyPlaced: Array<{ item: SourceItem, foundIn: string[] }>,
        coverage: number,
        classCoverage: number,
        functionCoverage: number
    ) {
        const reportPath = path.join(docPath, 'Validation_Report.md');
        let content = `# Documentation Validation Report\n\n`;
        content += `**Overall Quality Score:** ${coverage}%\n\n`;

        content += `### Granular Coverage\n`;
        content += `- **Class Coverage:** ${classCoverage}%\n`;
        content += `- **Function/Method Coverage:** ${functionCoverage}%\n\n`;

        content += `### Breakdown\n`;
        content += `- **Total Tracked Items:** ${totalItems}\n`;
        content += `- **Properly Documented:** ${properlyDocumented.length}\n`;
        content += `- **Incorrectly Placed Items:** ${incorrectlyPlaced.length} (Provides 20% partial credit)\n`;
        content += `- **Missing Items:** ${missing.length} (Provides 0% credit)\n\n`;

        content += `## Documented Items Quality\n`;
        if (properlyDocumented.length === 0) {
            content += `- None!\n\n`;
        } else {
            properlyDocumented.forEach(entry => {
                const q = entry.quality;
                content += `- **\`${entry.item.name}\`** [${q.score}%]\n`;
                content += `  - Description check: ${q.hasDescription ? 'Pass ✅' : 'Fail ❌'}\n`;
                content += `  - Parameters check: ${q.hasParameters ? 'Pass ✅' : 'Fail ❌'}\n`;
                content += `  - Returns check: ${q.hasReturns ? 'Pass ✅' : 'Fail ❌'}\n`;
                content += `  - Example Code check: ${q.hasExample ? 'Pass ✅' : 'Fail ❌'}\n`;
            });
            content += `\n`;
        }

        content += `## Incorrectly Placed Items\n`;
        content += `The following items were found in the codebase and in the broader documentation, but **not** in their required \`API_Documentation.md\` file:\n\n`;
        if (incorrectlyPlaced.length === 0) {
            content += `- None!\n\n`;
        } else {
            incorrectlyPlaced.forEach(entry => {
                content += `- \`${entry.item.name}\` (Found in: ${entry.foundIn.map(f => `\`${f}\``).join(', ')})\n`;
            });
            content += `\n`;
        }

        content += `## Completely Missing Items\n`;
        content += `The following functions or classes were found in the source code but are missing from all documentation:\n\n`;
        if (missing.length === 0) {
            content += `- None!\n\n`;
        } else {
            missing.forEach(entry => {
                content += `- \`${entry.name}\`\n`;
            });
            content += `\n`;
        }

        fs.writeFileSync(reportPath, content, 'utf-8');
    }
}
