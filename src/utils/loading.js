export function showLoadingOverlay(message = "Loading...") {
    const overlay = document.createElement("div");
    overlay.id = "page-loading-overlay";
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: #F5F5F5;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        gap: 16px;
    `;

    const spinner = document.createElement("div");
    spinner.style.cssText = `
        width: 50px;
        height: 50px;
        border: 4px solid #E8E8E8;
        border-top: 4px solid #00205B;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        box-shadow: 0 4px 12px rgba(0, 32, 91, 0.2);
    `;

    const loadingText = document.createElement("div");
    loadingText.style.cssText = `
        font-size: 16px;
        color: #222222;
        font-weight: 600;
    `;
    loadingText.textContent = message;

    overlay.appendChild(spinner);
    overlay.appendChild(loadingText);
    document.body.appendChild(overlay);

    return overlay;
}

export function hideLoadingOverlay() {
    const overlay = document.getElementById("page-loading-overlay");
    console.log("Hiding loading overlay:", overlay);
    if (overlay) {
        overlay.remove();
    }
}
