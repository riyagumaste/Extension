function checkCheckout() {
    const pageText = document.body.innerText.toLowerCase();

    const checkoutKeywords = [
        "checkout",
        "payment",
        "pay now",
        "place order",
        "order summary",
        "payment details"
    ];

    let matches = 0;

    checkoutKeywords.forEach(keyword => {
        if (pageText.includes(keyword)) {
            matches++;
        }
    });

    const cardField = document.querySelector(
        'input[placeholder*="card" i]'
    );

    const cvvField = document.querySelector(
        'input[placeholder*="cvv" i]'
    );

    if (cardField) matches++;
    if (cvvField) matches++;

    return {
        detected: matches >= 2,
        indicators: matches
    };
}


// Get page text without the extension's own warning banner.
function getCleanPageText() {
    const clone = document.body.cloneNode(true);

    // Remove the warning banner before sending text to the AI.
    clone.querySelectorAll("[data-transaction-check-banner]")
        .forEach(element => element.remove());

    // Exclude scripts, styles, and hidden content.
    clone.querySelectorAll("script, style, noscript")
        .forEach(element => element.remove());

    return clone.innerText.slice(0, 50000);
}


// Respond to the extension popup.
chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
        if (message.type !== "CHECK_CHECKOUT") {
            return;
        }

        const result = checkCheckout();

        const transaction = result.detected
            ? extractTransactionData()
            : null;

        sendResponse({
            detected: result.detected,
            indicators: result.indicators,
            transaction: transaction,
            url: window.location.href,
            pageText: getCleanPageText()
        });
    }
);


// Display the checkout warning banner.
const checkoutResult = checkCheckout();

if (checkoutResult.detected) {
    const transaction = extractTransactionData();

    const warning = document.createElement("div");

    // This marker lets getCleanPageText() exclude the banner.
    warning.setAttribute("data-transaction-check-banner", "true");

    warning.innerHTML = `
        <div style="font-size:18px;font-weight:bold;margin-bottom:8px;">
            🛡️ Transaction Check
        </div>
        <div style="font-size:14px;margin-bottom:8px;">
            ⚠️ Checkout page detected
        </div>
        <div style="font-size:13px;">
            Additional charges:
            <strong>₹${transaction.additionalCharges ?? 0}</strong>
        </div>
        <div style="font-size:12px;margin-top:8px;opacity:0.8;">
            Open the extension for full transaction details.
        </div>
    `;

    warning.style.cssText = `
        position:fixed;
        top:20px;
        right:20px;
        width:280px;
        padding:16px;
        background:white;
        color:#222;
        border:1px solid #ddd;
        border-radius:12px;
        box-shadow:0 4px 16px rgba(0,0,0,0.2);
        z-index:2147483647;
        font-family:Arial,sans-serif;
    `;

    document.body.appendChild(warning);
}