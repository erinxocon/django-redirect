(function() {
    const URL_REGEX = /^https?:\/\/docs\.djangoproject\.com\/en\/[^\/]*?\/(.*)/;

    let version = "dev";
    updateVersion();

    /**
     * Check whether given URL returns 200 HTTP status code and redirects
     * to it if so.
     *
     * Also, save the original URL in the localStorage so the onBeforeRequest
     * listener can redirect immediately next time visiting the same page.
     *
     * @param {string} oldUrl the original Python 2 docs URL that should be
     *  cached in localStorage
     * @param {string} url Python 3 docs URL
     * @param tabId current tab ID
     * @param {function} sendResponse callback function to call with the new
     *  URL (or null if an error occurred)
     */
    function checkDocsExist(oldUrl, url, tabId, sendResponse) {
        let request = new XMLHttpRequest();
        request.onreadystatechange = function() {
            if (request.readyState === 4) {
                localStorage.setItem(oldUrl, true);
                browserAPI.api.pageAction.show(tabId);
                sendResponse(url);
                // DONE
                // if (request.status === 200) {

                // } else {
                //     browserAPI.api.pageAction.setTitle({
                //         tabId: tabId,
                //         title:
                //             "Could not redirect (HTTP status code: " +
                //             request.status +
                //             ")"
                //     });
                //     sendResponse(null);
                // }
            }
        };
        request.open("HEAD", url, true);
        request.send();
    }

    /*
     * onBeforeRequest listener that redirects to py3 docs immediately if the
     * requested page was visited before (using localStorage cache)
     */
    browserAPI.api.webRequest.onBeforeRequest.addListener(
        function(details) {
            let url = details.url;
            alert(url);
            if (version && localStorage.getItem(url)) {
                return { redirectUrl: url.replace(URL_REGEX, URL_REPLACEMENT) };
            }
        },
        {
            urls: ["*://docs.djangoproject.com/en/*"],
            types: ["main_frame"]
        },
        ["blocking"]
    );

    /**
     * Update isUpdate variable value from storage.local.
     */
    function updateVersion() {
        browserAPI.api.storage.local.get("django_version", data => {
            version = data.django_version;
        });
    }

    /**
     * Set new isUpdate variable value and store it in storage.local.
     * @param {boolean} enabled whether or not redirecting is currently enabled
     */
    function setVersion(django_version) {
        version = django_version;
        browserAPI.api.storage.local.set({ django_version: version });
    }

    browserAPI.api.runtime.onMessage.addListener(
        (request, sender, sendResponse) => {
            const URL_REPLACEMENT = `https://docs.djangoproject.com/en/${version}/$1`;
            // if (URL_REPLACEMENT.includes(version)) {
            //     return;
            // } else

            if (request.action === "redirect") {
                let tabId = sender.tab.id;
                browserAPI.api.pageAction.show(tabId);
                if (!version) {
                    return;
                }

                if (
                    !sender.url.includes(version) &&
                    URL_REGEX.test(sender.url)
                ) {
                    browserAPI.api.pageAction.setTitle({
                        tabId: tabId,
                        title: "Redirecting..."
                    });
                    checkDocsExist(
                        sender.url,
                        sender.url.replace(URL_REGEX, URL_REPLACEMENT),
                        tabId,
                        sendResponse
                    );

                    return true;
                }
            } else if (request.action === "getVersion") {
                sendResponse(version);
            } else if (request.action === "setVersion") {
                console.log(request.django_version);
                setVersion(request.django_version);
            }
        }
    );
})();
