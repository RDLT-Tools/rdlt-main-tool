export function startBlobDownload(filename, content, type="text/plain") {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);

    startURLDownload(filename, url);
}

export function startURLDownload(filename, url) {
    const tmpParent = document.querySelector("#tmp");
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    tmpParent.appendChild(anchor);
    anchor.click();
    
    tmpParent.removeChild(anchor);
    URL.revokeObjectURL(url);
}

export function sanitizeForFilename(str) {
    return str.replace(/[^A-Za-z0-9_\-]+/g, "").trim();
}

/**
 * @param {string} str 
 * @returns {string}
 */
export function serializeString(str) {
    str = str.trim();
    if(str === "") return `""`;

    // If string contains special characters, enclose in quotation marks
    if(/[^a-zA-Z0-9_]/.test(str)) {
        return `"${str.replace(/"/g, '\\"')}"`;
    }

    return str;
}