
const SENSITIVE_FIELDS = [
    "card number",
    "cardnumber",
    "cvv",
    "cvc",
    "otp",
    "password",
    "upi pin",
    "pin number"
];

function isSensitiveField(text) {
    const normalizedText = String(text || "").toLowerCase().trim();

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

function extractAmount(text) {
    const match = String(text || "").match(/₹\s*([\d,]+(?:\.\d{1,2})?)/);

    if (!match) {
        return null;
    }

    return Number(match[1].replace(/,/g, ""));
}

function getAmountFromRow(label) {
    const rows = document.querySelectorAll(".fee-row, .row, p, li");

    for (const row of rows) {
        const text = (row.innerText || "").trim();

        if (
            text.toLowerCase().includes(label.toLowerCase()) &&
            !isSensitiveField(text)
        ) {
            const amount = extractAmount(text);

            if (amount !== null) {
                return amount;
            }
        }
    }

    return null;
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

    // Never read or return payment input values.
    document.querySelectorAll("input").forEach(input => {
        if (isSensitiveInput(input)) {
            console.log("Sensitive input skipped:", input.id || input.type);
        }
    });

    // Product name: prefer the product card heading.
    const productHeading = document.querySelector(".product-info h3") ||
        [...document.querySelectorAll("h1, h2, h3")].find(element => {
            const text = element.innerText.toLowerCase();

            return text.includes("wireless headphones");
        });

    if (productHeading) {
        data.product = productHeading.innerText.trim();
    }

    // Extract amounts from visible fee rows.
    data.productPrice = getAmountFromRow("Product Price");
    data.deliveryFee = getAmountFromRow("Delivery Fee");
    data.convenienceFee = getAmountFromRow("Convenience Fee");
    data.tax = getAmountFromRow("Tax");

    // Prefer the order summary's Total row, not a generic heading.
    const totalRow = [...document.querySelectorAll(".fee-row")].find(row => {
        const label = row.querySelector("span:first-child");

        return label &&
            label.innerText.trim().toLowerCase() === "total";
    });

    if (totalRow) {
        data.total = extractAmount(totalRow.innerText);
    }

    // Fallback for simpler test pages with a Total heading.
    if (data.total === null) {
        const totalHeading = [...document.querySelectorAll("h1, h2, h3, p")].find(
            element => /^\s*total\s*:/i.test(element.innerText.trim())
        );

        if (totalHeading) {
            data.total = extractAmount(totalHeading.innerText);
        }
    }

    // Calculate extra charges only when both values were extracted.
    if (data.total !== null && data.productPrice !== null) {
        data.additionalCharges = data.total - data.productPrice;
    }

    return data;
}

console.log("Transaction extractor loaded.");
