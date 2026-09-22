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

                if (!response || !response.detected) {
                    status.innerText =
                        "No checkout page detected.";
                    return;
                }

                status.innerText =
                    "⚠️ Checkout page detected!";

                const transaction =
                    response.transaction;

                if (!transaction) {
                    return;
                }

                document.getElementById("transaction")
                    .style.display = "block";

                document.getElementById("product")
                    .innerText =
                    transaction.product || "Not detected";

                document.getElementById("productPrice")
                    .innerText =
                    transaction.productPrice ?? "-";

                document.getElementById("deliveryFee")
                    .innerText =
                    transaction.deliveryFee ?? "-";

                document.getElementById("convenienceFee")
                    .innerText =
                    transaction.convenienceFee ?? "-";

                document.getElementById("tax")
                    .innerText =
                    transaction.tax ?? "-";

                document.getElementById("total")
                    .innerText =
                    transaction.total ?? "-";

                document.getElementById("additionalCharges")
                    .innerText =
                    transaction.additionalCharges ?? "-";
            }
        );
    }
);