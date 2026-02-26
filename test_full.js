"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Mock vscode
const vscode = {
    window: { showWarningMessage: console.log },
    WorkspaceFolder: {}
};
global.vscode = vscode;
// Now we can require DocValidator (by bypassing the typescript import problem let's just copy the logic or require the compiled js)
const DocValidator = require('./out/DocValidator').DocValidator;
async function test() {
    const validator = new DocValidator();
    const workspaceFolder = {
        uri: { fsPath: __dirname }
    };
    const result = await validator.validate(workspaceFolder);
    console.log("Result:", JSON.stringify(result, null, 2));
}
test();
//# sourceMappingURL=test_full.js.map