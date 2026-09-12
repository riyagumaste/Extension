// Check whether the current page looks like a checkout page
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

    // Check for payment fields
    const cardField = document.querySelector(
        'input[placeholder*="card" i]'
    );

    const cvvField = document.querySelector(
        'input[placeholder*="cvv" i]'
    );

    if (cardField) {
        matches++;
    }

    if (cvvField) {
        matches++;
    }

    return {
        detected: matches >= 2,
        indicators: matches
    };
}


// Listen when the popup asks for checkout status
chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {

        if (message.type === "CHECK_CHECKOUT") {

            const result = checkCheckout();

            sendResponse(result);
        }
    }
);
