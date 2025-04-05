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