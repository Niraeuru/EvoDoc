"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
async function extractSourceItems(rootPath) {
    const allowedExtensions = ['.ts', '.js', '.py', '.java', '.cs', '.go', '.cpp', '.h', '.jsx', '.tsx'];
    const excludeDirs = ['node_modules', '.git', 'out', 'dist', 'build', '.vscode', 'Documentation'];
    const items = new Set();
    const walk = (dir) => {
        if (!fs.existsSync(dir))
            return;
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                if (!excludeDirs.includes(file)) {
                    walk(filePath);
                }
            }
            else {
                if (allowedExtensions.includes(path.extname(file))) {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    // Extract classes
                    const classRegex = /class\s+([a-zA-Z0-9_]+)/g;
                    let match;
                    while ((match = classRegex.exec(content)) !== null) {
                        items.add(match[1]);
                    }
                    // Extract functions
                    const functionRegex = /(?:function|const|let)\s+([a-zA-Z0-9_]+)\s*=?\s*(?:\([^)]*\))?\s*(?:=>|{)/g;
                    while ((match = functionRegex.exec(content)) !== null) {
                        if (!['if', 'for', 'while', 'switch', 'catch', 'import', 'require', 'export'].includes(match[1])) {
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
async function extractDocItemsByFile(docPath) {
    const fileItems = {};
    const walk = (dir) => {
        if (!fs.existsSync(dir))
            return;
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                walk(filePath);
            }
            else {
                if (path.extname(file) === '.md') {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    const items = new Set();
                    const headerRegex = /^#+\s+(?:Class|Function|Interface)?\s*([a-zA-Z0-9_]+)/gim;
                    let match;
                    while ((match = headerRegex.exec(content)) !== null) {
                        items.add(match[1]);
                    }
                    fileItems[file] = items;
                }
            }
        }
    };
    walk(docPath);
    return fileItems;
}
async function test() {
    const rootPath = path.resolve(__dirname, 'src');
    const docPath = path.resolve(__dirname, 'Documentation');
    const sourceItems = await extractSourceItems(rootPath);
    const docItems = await extractDocItemsByFile(docPath);
    console.log(`Code Items:`, Array.from(sourceItems));
    console.log(`Doc Items:`, docItems);
}
test();
//# sourceMappingURL=test_validator.js.map