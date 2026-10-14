
const SENSITIVE_FIELDS = [
    "card number", "cardnumber", "credit card", "debit card",
    "cvv", "cvc", "security code", "otp", "password",
    "upi pin", "pin number", "bank account"
];

function isSensitiveField(text) {
    const normalizedText = String(text || "").toLowerCase().trim();
    return SENSITIVE_FIELDS.some(field => normalizedText.includes(field));
}

function isSensitiveInput(element) {
    const fieldInfo = [
        element.type,
        element.name,
        element.id,
        element.placeholder,
        element.autocomplete,
        element.getAttribute("aria-label")
    ].join(" ").toLowerCase();

    return isSensitiveField(fieldInfo) ||
        ["password", "tel"].includes((element.type || "").toLowerCase()) &&
        /card|cvv|cvc|otp|pin|account/i.test(fieldInfo);
}

function extractAmount(text) {
    const match = String(text || "").match(
        /(?:₹|INR|Rs\.?)\s*([\d,]+(?:\.\d{1,2})?)|([\d,]+(?:\.\d{1,2})?)\s*(?:₹|INR|Rs\.?)/i
    );

    if (!match) return null;

    const amount = Number((match[1] || match[2]).replace(/,/g, ""));
    return Number.isFinite(amount) ? amount : null;
}

function getAmountFromRow(label) {
    const rows = document.querySelectorAll(
        ".fee-row, .row, p, li"
    );

    for (const row of rows) {
        const text = (row.innerText || "").trim();

        if (
            text.toLowerCase().includes(label.toLowerCase()) &&
            !isSensitiveField(text)
        ) {
            const amount = extractAmount(text);
            if (amount !== null) return amount;
        }
    }

    return null;
}

function findAmountByLabels(labels) {
    const elements = document.querySelectorAll(
        "p, span, div, li, td, th, label, strong, h1, h2, h3, h4"
    );

    const labelPattern = new RegExp(
        "^\\s*(?:" + labels.join("|") + ")\\s*[:\\-]?\\s*",
        "i"
    );

    for (const element of elements) {
        const text = (element.innerText || element.textContent || "")
            .replace(/\s+/g, " ")
            .trim();

        if (!text || isSensitiveField(text)) continue;
        if (!labelPattern.test(text)) continue;

        const amount = extractAmount(text);
        if (amount !== null) return amount;
    }

    return null;
}

function findProductName() {
    const productHeading = document.querySelector(".product-info h3");

    if (productHeading) {
        const text = productHeading.innerText.trim();
        if (text && !isSensitiveField(text)) return text;
    }

    const excluded =
        /\b(checkout|payment details|order summary|total|shipping address)\b/i;

    const headings = document.querySelectorAll("h1, h2, h3, h4");

    for (const element of headings) {
        const text = (element.innerText || "").trim();

        if (
            text &&
            !excluded.test(text) &&
            !isSensitiveField(text) &&
            !extractAmount(text)
        ) {
            return text;
        }
    }

    return null;
}

function extractTransactionData() {
    const data = {
        product: findProductName(),
        productPrice: getAmountFromRow("Product Price"),
        deliveryFee: getAmountFromRow("Delivery Fee"),
        convenienceFee: getAmountFromRow("Convenience Fee"),
        tax: getAmountFromRow("Tax"),
        total: null,
        additionalCharges: null,
        validation: {
            status: "incomplete",
            expectedTotal: null,
            difference: null,
            missingFields: []
        }
    };

    // Fall back to label-based extraction when row extraction fails.
    if (data.productPrice === null) {
        data.productPrice = findAmountByLabels([
            "product price", "item price", "price", "subtotal"
        ]);
    }

    if (data.deliveryFee === null) {
        data.deliveryFee = findAmountByLabels([
            "delivery fee", "delivery charge", "shipping fee",
            "shipping charge", "delivery", "shipping"
        ]);
    }

    if (data.convenienceFee === null) {
        data.convenienceFee = findAmountByLabels([
            "convenience fee", "platform fee", "service fee",
            "processing fee"
        ]);
    }

    if (data.tax === null) {
        data.tax = findAmountByLabels(["tax", "gst", "sales tax"]);
    }

    // Prefer the exact Total row used by the checkout page.
    const totalRow = [...document.querySelectorAll(".fee-row")].find(row => {
        const label = row.querySelector("span:first-child");
        return label &&
            label.innerText.trim().toLowerCase() === "total";
    });

    if (totalRow) {
        data.total = extractAmount(totalRow.innerText);
    }

    // Fallback for other checkout layouts.
    if (data.total === null) {
        data.total = findAmountByLabels([
            "grand total", "order total", "total payable",
            "total amount", "total"
        ]);
    }

    const feeFields = ["deliveryFee", "convenienceFee", "tax"];

    data.validation.missingFields = [
        "productPrice",
        ...feeFields,
        "total"
    ].filter(field => data[field] === null);

    if (data.total !== null && data.productPrice !== null) {
        data.additionalCharges = Number(
            (data.total - data.productPrice).toFixed(2)
        );
    }

    const allAmountsPresent =
        data.productPrice !== null &&
        feeFields.every(field => data[field] !== null) &&
        data.total !== null;

    if (allAmountsPresent) {
        data.validation.expectedTotal =
            data.productPrice +
            data.deliveryFee +
            data.convenienceFee +
            data.tax;

        data.validation.difference = Number(
            (data.total - data.validation.expectedTotal).toFixed(2)
        );

        data.validation.status =
            Math.abs(data.validation.difference) < 0.01
                ? "valid"
                : "mismatch";
    }

    return data;
}

// Do not log payment-field values or sensitive input contents.
const transactionData = extractTransactionData();
console.log("Transaction extraction result:", transactionData);
