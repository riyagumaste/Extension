chrome.tabs.query(
    { active: true, currentWindow: true },
    function (tabs) {

        if (!tabs || !tabs[0]) {
            return;
        }

        chrome.tabs.sendMessage(
            tabs[0].id,
            { type: "CHECK_CHECKOUT" },
            function (response) {

                const status =
                    document.getElementById("status");

                const transactionBox =
                    document.getElementById("transaction");

                if (chrome.runtime.lastError) {

                    status.innerText =
                        "Unable to analyze this page.";

                    return;
                }

                if (!response) {

                    status.innerText =
                        "Unable to analyze this page.";

                    return;
                }

                if (response.detected) {

                    status.innerText =
                        "⚠️ Checkout page detected!";

                    const transaction =
                        response.transaction;

                    if (transaction) {

                        document.getElementById("product").innerText =
                            transaction.product || "Unknown product";

                        document.getElementById("productPrice").innerText =
                            transaction.productPrice ?? "N/A";

                        document.getElementById("deliveryFee").innerText =
                            transaction.deliveryFee ?? "N/A";

                        document.getElementById("convenienceFee").innerText =
                            transaction.convenienceFee ?? "N/A";

                        document.getElementById("tax").innerText =
                            transaction.tax ?? "N/A";

                        document.getElementById("total").innerText =
                            transaction.total ?? "N/A";

                        document.getElementById("additionalCharges").innerText =
                            transaction.additionalCharges ?? "N/A";

                        transactionBox.style.display = "block";
                    }

                } else {

                    status.innerText =
                        "No checkout page detected.";

                    transactionBox.style.display = "none";
                }
            }
        );
    }
);
