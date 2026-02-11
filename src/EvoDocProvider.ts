import * as vscode from 'vscode';

export class EvoDocProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'evodoc-sidebar';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
    ) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'toggle':
                    vscode.commands.executeCommand('evodoc.toggle', data.value);
                    break;
                case 'generate':
                    vscode.commands.executeCommand('evodoc.generate');
                    break;

            }
        });
    }

    public updateStatus(isActive: boolean) {
        if (this._view) {
            this._view.webview.postMessage({ type: 'updateStatus', value: isActive });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
        const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
        const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'sidebar.css'));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'sidebar.js'));

        // Use a nonce to only allow specific scripts to be run
        const nonce = getNonce();

        return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleMainUri}" rel="stylesheet">
				<title>EvoDoc</title>
			</head>
			<body>
                <div class="container">
                    <div class="header">
                        <h2>EvoDoc</h2>
                        <div class="status-indicator inactive" id="status-indicator">
                            <span class="dot"></span>
                            <span class="text">Inactive</span>
                        </div>
                    </div>

                    <div class="card">
                        <h3>Status</h3>
                        <div class="toggle-container">
                            <label class="switch">
                                <input type="checkbox" id="toggle-switch">
                                <span class="slider round"></span>
                            </label>
                            <span id="toggle-label">OFF</span>
                        </div>
                    </div>

                    <div class="card">
                        <h3>Actions</h3>
                        <button id="generate-btn" class="primary-btn">Generate Documentation</button>
                    </div>


                </div>

				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
