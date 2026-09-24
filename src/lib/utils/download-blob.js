export default (filename, data) => {
    const downloadLink = document.createElement('a');
    document.body.appendChild(downloadLink);

    // Convert Uint8Array or ArrayBuffer to Blob if needed.
      // IMPORTANT: the Blob MIME type must NOT be 'application/zip' — browsers
      // (notably Safari on macOS, but also some Linux Chromium builds) will then
      // *derive* a canonical extension (.zip) from the MIME and suffix it onto
      // whatever filename the caller asked for (so a requested .sb3 ends up as
      // .sb3.zip).  'application/octet-stream' is opaque — browsers don't infer
      // anything from it and the download filename is left untouched.
      let blob;
      if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
          blob = new Blob([data], {type: 'application/octet-stream'});
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
