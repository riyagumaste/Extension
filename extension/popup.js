chrome.tabs.query(
    { active: true, currentWindow: true },
    function(tabs) {

        chrome.tabs.sendMessage(
            tabs[0].id,
            { type: "CHECK_CHECKOUT" },
            function(response) {

                const status =
                    document.getElementById("status");

                if (chrome.runtime.lastError) {
                    status.innerText =
                        "Unable to analyze this page.";
                    return;
                }

                if (response && response.detected) {

                    status.innerText =
                        "Checkout page detected!\n" +
                        "Indicators found: " +
                        response.indicators;

                } else {

                    status.innerText =
                        "No checkout page detected.";
                }
            }
        );
    }
);
