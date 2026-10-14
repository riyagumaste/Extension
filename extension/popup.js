
const BACKEND_URL = "http://127.0.0.1:5000";

chrome.tabs.query(
    { active: true, currentWindow: true },
    function (tabs) {
        const status = document.getElementById("status");

        if (!tabs || !tabs[0] || !tabs[0].id) {
            status.innerText = "Unable to access the active tab.";
            return;
        }

        chrome.tabs.sendMessage(
            tabs[0].id,
            { type: "CHECK_CHECKOUT" },
            function (response) {
                if (chrome.runtime.lastError || !response) {
                    status.innerText =
                        "Unable to analyze this page. Refresh it and try again.";

                    runAIAnalysis("", tabs[0].url || "");
                    return;
                }

                if (!response.detected) {
                    status.innerText = "No checkout page detected.";
                } else {
                    status.innerText = "⚠️ Checkout page detected!";

                    const transaction = response.transaction;

                    if (transaction) {
                        document.getElementById("transaction")
                            .style.display = "block";

                        document.getElementById("product").innerText =
                            transaction.product || "Not detected";

                        document.getElementById("productPrice").innerText =
                            transaction.productPrice ?? "-";

                        document.getElementById("deliveryFee").innerText =
                            transaction.deliveryFee ?? "-";

                        document.getElementById("convenienceFee").innerText =
                            transaction.convenienceFee ?? "-";

                        document.getElementById("tax").innerText =
                            transaction.tax ?? "-";

                        document.getElementById("total").innerText =
                            transaction.total ?? "-";

                        document.getElementById("additionalCharges").innerText =
                            transaction.additionalCharges ?? "-";
                    }
                }

                runAIAnalysis(
                    response.pageText || "",
                    response.url || tabs[0].url || ""
                );
            }
        );
    }
);


async function runAIAnalysis(pageText, pageUrl) {
    const aiStatus = document.getElementById("aiStatus");
    const urlRisk = document.getElementById("urlRisk");
    const textSignals = document.getElementById("textSignals");
    const visualSignals = document.getElementById("visualSignals");

    const riskLevel = document.getElementById("riskLevel");
    const riskExplanation = document.getElementById("riskExplanation");

    aiStatus.innerText = "Analyzing with AI models...";
    urlRisk.innerText = "Checking...";
    urlRisk.style.color = "#555";

    textSignals.replaceChildren();
    visualSignals.innerText = "Analyzing visual signals...";

    if (riskLevel) {
        riskLevel.innerText = "Analysis in progress...";
        riskLevel.style.color = "#555";
    }

    if (riskExplanation) {
        riskExplanation.innerText =
            "Checking URL, text, and visual signals.";
    }

    try {
        let screenshot = "";

        try {
            screenshot = await new Promise((resolve) => {
                chrome.tabs.captureVisibleTab(
                    null,
                    { format: "png" },
                    (dataUrl) => {
                        if (chrome.runtime.lastError) {
                            resolve("");
                        } else {
                            resolve(dataUrl || "");
                        }
                    }
                );
            });
        } catch (error) {
            console.log("Screenshot capture unavailable:", error);
        }

        const result = await fetch(`${BACKEND_URL}/analyze`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                url: pageUrl,
                text: pageText,
                screenshot: screenshot
            })
        });

        if (!result.ok) {
            throw new Error(`Backend returned HTTP ${result.status}`);
        }

        const data = await result.json();

        // Display URL risk, handling local test pages separately.
        const isLocalTestPage =
            pageUrl.startsWith("file://") ||
            pageUrl.startsWith("http://127.0.0.1") ||
            pageUrl.startsWith("http://localhost");

        if (isLocalTestPage) {
            urlRisk.innerText = "Local test page (URL check skipped)";
            urlRisk.style.color = "#555";
        } else {
            urlRisk.innerText = data.url_risk || "Unavailable";

            if (data.url_risk === "suspicious") {
                urlRisk.style.color = "#b42318";
            } else if (data.url_risk === "safe") {
                urlRisk.style.color = "#18794e";
            } else {
                urlRisk.style.color = "#555";
            }
        }
        // Hide obvious test explanations and ordinary checkout labels.
        const ignoredPhrases = [
            "demo checkout",
            "test environment",
            "use fictional details",
            "demonstration options only",
            "simulated payment option",
            "demo timer",
            "not a real offer deadline",
            "limited-time promotional messaging for dark-pattern testing",
            "optional protection plan",
            "optional extra service",
            "test scenario",
            "this test page intentionally includes urgency language",
            "so the detection extension can be evaluated",
            "review all fees and optional add-ons before continuing",
            "quantity: 1 · in stock",
            "novasound pro · midnight black",
            "last name",
            "product price",
            "additional charges",
            "before you pay",
            "🛍️ your item",
            "✓ cart"
        ];

        const genericLabels = new Set([
            "product",
            "add-ons",
            "addons",
            "complete your order",
            "review your items and charges before placing your order."
        ]);

        const signals = (
            Array.isArray(data.text_analysis) ? data.text_analysis : []
        ).filter(signal => {
            if (!signal || signal.category === "Non_Dark_Pattern") {
                return false;
            }

            const text = (signal.text || "")
                .trim()
                .toLowerCase()
                .replace(/\s+/g, " ");

            // Ignore exact generic checkout labels.
            if (
                genericLabels.has(text) ||
                text.includes("pay now · demo only")
            ) {
                return false;
            }
            // Ignore known test-page explanations.
            if (ignoredPhrases.some(phrase => text.includes(phrase))) {
                return false;
            }

            return true;
        });
        if (signals.length === 0) {
            const item = document.createElement("li");
            item.innerText = "No remaining text signals after filtering.";
            textSignals.appendChild(item);
        } else {
            signals.forEach(signal => {
                const item = document.createElement("li");
                item.innerText =
                    `${signal.category || "Potential signal"}: "${signal.text || ""}"`;
                textSignals.appendChild(item);
            });
        }
        // Display visual-analysis signals
        const visual = data.visual_analysis;
        const visualFindings = [];

        if (visual && visual.available) {
            if (visual.scarcity_detected) {
                visualFindings.push("Scarcity");
            }

            if (visual.urgency_detected) {
                visualFindings.push("Urgency");
            }

            if (visual.payment_detected) {
                visualFindings.push("Payment section");
            }

            visualSignals.innerText = visualFindings.length
                ? `Detected: ${visualFindings.join(", ")}`
                : "No listed visual signals detected.";
        } else {
            visualSignals.innerText =
                "No screenshot supplied or visual analysis unavailable.";
        }

        // Build the overall Risk Summary
        const reasons = [];

        const hasSuspiciousUrl = data.url_risk === "suspicious";
        const hasDarkPatterns = signals.length > 0;

        const hasVisualConcerns = Boolean(
            visual &&
            visual.available &&
            (visual.scarcity_detected || visual.urgency_detected)
        );

        if (hasSuspiciousUrl) {
            reasons.push("The URL was flagged as suspicious.");
        }

        if (hasDarkPatterns) {
            reasons.push(
                `${signals.length} potential dark-pattern signal(s) detected.`
            );
        }

        if (hasVisualConcerns) {
            reasons.push(
                "Visual analysis detected possible urgency or scarcity signals."
            );
        }

        if (riskLevel && riskExplanation) {
            if (reasons.length > 0) {
                riskLevel.innerText = "Potential Concerns Detected";
                riskLevel.style.color = "#b42318";
                riskExplanation.innerText = reasons.join(" ");
            } else if (
                data.url_risk === "safe" &&
                !hasDarkPatterns &&
                visual &&
                visual.available
            ) {
                riskLevel.innerText = "No Listed Concerns Detected";
                riskLevel.style.color = "#18794e";
                riskExplanation.innerText =
                    "The models did not flag the checked signals. This does not guarantee the website is safe.";
            } else {
                riskLevel.innerText = "Review Findings";
                riskLevel.style.color = "#555";
                riskExplanation.innerText =
                    "Analysis completed. Review the URL, text, and visual findings above.";
            }
        }

        aiStatus.innerText = "AI analysis completed.";

    } catch (error) {
        console.error("AI analysis failed:", error);

        aiStatus.innerText =
            "AI backend unavailable. Check that the Python server is running.";

        urlRisk.innerText = "Unavailable";
        urlRisk.style.color = "#b42318";

        textSignals.replaceChildren();

        const item = document.createElement("li");
        item.innerText = "Could not retrieve AI predictions.";
        textSignals.appendChild(item);

        visualSignals.innerText = "Not analyzed.";

        // Show the backend error in Risk Summary
        if (riskLevel) {
            riskLevel.innerText = "Analysis Unavailable";
            riskLevel.style.color = "#b42318";
        }

        if (riskExplanation) {
            riskExplanation.innerText =
                "The AI backend could not be reached. Start the Python server and try again.";
        }
    }
}
