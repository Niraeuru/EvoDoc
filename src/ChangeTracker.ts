import * as vscode from 'vscode';

export class ChangeTracker {
    private _changedLinesCount: number = 0;

    constructor() { }

    public get changedLinesCount(): number {
        return this._changedLinesCount;
    }

    public trackChange(event: vscode.TextDocumentChangeEvent) {

        for (const change of event.contentChanges) {
            const rangeLines = change.range.end.line - change.range.start.line + 1;
            const textLines = change.text.split('\n').length;

            const linesRemoved = change.rangeLength > 0 ? (change.range.end.line - change.range.start.line) : 0;

            const linesAdded = (change.text.match(/\n/g) || []).length;

            this._changedLinesCount += Math.max(1, linesRemoved + linesAdded);
        }

        console.log(`EvoDoc: Total tracked changes: ${this._changedLinesCount}`);
    }

    public reset() {
        this._changedLinesCount = 0;
        console.log('EvoDoc: Change counter reset.');
    }
}
