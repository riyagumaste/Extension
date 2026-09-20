const SENSITIVE_FIELDS = [
    "card number",
    "cardnumber",
    "cvv",
    "cvc",
    "otp",
    "password",
    "upi pin",
    "pin"
];
function isSensitiveField(text) {
    const normalizedText = text.toLowerCase().trim();

    return SENSITIVE_FIELDS.some(field =>
        normalizedText.includes(field)
    );
}
function isSensitiveInput(element) {
    const fieldInfo = [
        element.type,
        element.name,
        element.id,
        element.placeholder,
        element.autocomplete
    ].join(" ").toLowerCase();

    return SENSITIVE_FIELDS.some(field =>
        fieldInfo.includes(field)
    );
}
function extractTransactionData() {

    const data = {
        product: null,
        productPrice: null,
        deliveryFee: null,
        convenienceFee: null,
        tax: null,
        total: null,
        additionalCharges: null
    };

    const headings = document.querySelectorAll("h1, h2, h3");
    const paragraphs = document.querySelectorAll("p,h2");
    const inputs = document.querySelectorAll("input");

inputs.forEach((input) => {
    if (isSensitiveInput(input)) {
       console.log(
    "Sensitive input skipped:",
    input.type,
    input.name,
    input.id,
    input.placeholder
);
    }
});

    // Product name
    const productHeading = [...headings].find(element =>
    element.innerText.toLowerCase().includes("wireless") ||
    element.innerText.toLowerCase().includes("headphones")
);

if (productHeading) {
    data.product = productHeading.innerText.trim();
}

    // Extract transaction amounts
    paragraphs.forEach((element) => {

        const text = element.innerText.trim();
        if (isSensitiveField(text)) {
    return;
}

        if (text.includes("Product Price")) {
            data.productPrice = extractAmount(text);
        }

        if (text.includes("Delivery Fee")) {
            data.deliveryFee = extractAmount(text);
        }

        if (text.includes("Convenience Fee")) {
            data.convenienceFee = extractAmount(text);
        }

        if (text.includes("Tax")) {
            data.tax = extractAmount(text);
        }

       const totalElement = [...document.querySelectorAll("h2")]
    .find(element => element.innerText.toLowerCase().includes("total"));

if (totalElement) {
    data.total = extractAmount(totalElement.innerText);
}
    });
    if (data.total !== null && data.productPrice !== null) {
    data.additionalCharges = data.total - data.productPrice;
}

    return data;
}

function extractAmount(text) {

    const match = text.match(/₹\s*([\d,]+)/);

    if (!match) {
        return null;
    }

    return Number(match[1].replace(/,/g, ""));
}

const transaction = extractTransactionData();

console.log("TRANSACTION DATA:");
console.log(transaction);