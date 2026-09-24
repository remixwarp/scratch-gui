export default (filename, data) => {
    const downloadLink = document.createElement('a');
    document.body.appendChild(downloadLink);

    // Convert Uint8Array or ArrayBuffer to Blob if needed
    let blob;
    if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
        blob = new Blob([data], {type: 'application/zip'});
    } else {
        blob = data;
    }

    // Use special ms version if available to get it working on Edge.
    if (navigator.msSaveOrOpenBlob) {
        navigator.msSaveOrOpenBlob(blob, filename);
        return;
    }

    if ('download' in HTMLAnchorElement.prototype) {
        const url = window.URL.createObjectURL(blob);
        downloadLink.href = url;
        downloadLink.download = filename;
        // Intentionally *not* setting downloadLink.type here.  Some browsers honour the MIME hint by
          // appending a matching extension to the filename (.zip is the usual culprit),
          // which clashes with our explicit .sb3 extension.  Leaving it unset lets the
          // download attribute win and preserves the user-picked filename exactly.
        downloadLink.click();
        // remove the link after a timeout to prevent a crash on iOS 13 Safari
        window.setTimeout(() => {
            document.body.removeChild(downloadLink);
            window.URL.revokeObjectURL(url);
        }, 1000);
    } else {
        // iOS 12 Safari, open a new page and set href to data-uri
        let popup = window.open('', '_blank');
        const reader = new FileReader();
        reader.onloadend = function () {
            popup.location.href = reader.result;
            popup = null;
        };
        reader.readAsDataURL(blob);
    }

};
