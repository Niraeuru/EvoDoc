// @ts-check

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
    // @ts-ignore
    const vscode = acquireVsCodeApi();

    const statusIndicator = document.getElementById('status-indicator');
    const statusText = statusIndicator?.querySelector('.text');
    const toggleSwitch = /** @type {HTMLInputElement} */ (document.getElementById('toggle-switch'));
    const toggleLabel = document.getElementById('toggle-label');
    const generateBtn = document.getElementById('generate-btn');

    // Restore state
    const previousState = vscode.getState();
    if (previousState) {
        updateState(previousState.isActive);
    }

    // Handle messages from the extension
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'updateStatus':
                updateState(message.value);
                break;
        }
    });

    // Event Listeners
    toggleSwitch?.addEventListener('change', () => {
        const isActive = toggleSwitch.checked;
        vscode.postMessage({ type: 'toggle', value: isActive });
        updateState(isActive);
    });

    generateBtn?.addEventListener('click', () => {
        vscode.postMessage({ type: 'generate' });
    });

    /**
     * @param {boolean} isActive
     */
    function updateState(isActive) {
        if (toggleSwitch) {
            toggleSwitch.checked = isActive;
        }

        if (toggleLabel) {
            toggleLabel.textContent = isActive ? 'ON' : 'OFF';
        }

        if (statusIndicator && statusText) {
            if (isActive) {
                statusIndicator.classList.remove('inactive');
                statusIndicator.classList.add('active');
                statusText.textContent = 'Active';
            } else {
                statusIndicator.classList.remove('active');
                statusIndicator.classList.add('inactive');
                statusText.textContent = 'Inactive';
            }
        }

        vscode.setState({ isActive });
    }
}());
