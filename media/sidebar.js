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
    const exportBtn = document.getElementById('export-btn');
    const validateBtn = document.getElementById('validate-btn');

    const toggleDesktop = /** @type {HTMLInputElement} */ (document.getElementById('toggle-desktop'));
    const toggleTablet = /** @type {HTMLInputElement} */ (document.getElementById('toggle-tablet'));
    const toggleMobile = /** @type {HTMLInputElement} */ (document.getElementById('toggle-mobile'));


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

    exportBtn?.addEventListener('click', () => {
        vscode.postMessage({ type: 'exportDocs' });
    });

    validateBtn?.addEventListener('click', () => {
        vscode.postMessage({ type: 'validateDocs' });
    });

    function sendSizes() {
        vscode.postMessage({
            type: 'updateSizes',
            sizes: {
                desktop: toggleDesktop ? toggleDesktop.checked : true,
                tablet: toggleTablet ? toggleTablet.checked : false,
                mobile: toggleMobile ? toggleMobile.checked : false
            }
        });
    }

    toggleDesktop?.addEventListener('change', sendSizes);
    toggleTablet?.addEventListener('change', sendSizes);
    toggleMobile?.addEventListener('change', sendSizes);

    // Send initial size state
    sendSizes();

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
