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

    aiStatus.innerText = "Analyzing with AI models...";
    urlRisk.innerText = "Checking...";
    textSignals.replaceChildren();

    try {
        let screenshot = "";

        try {
            screenshot = await new Promise((resolve) => {
                chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
                    if (chrome.runtime.lastError) {
                        resolve("");
                    } else {
                        resolve(dataUrl || "");
                    }
                });
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

        urlRisk.innerText = data.url_risk || "Unavailable";

        if (data.url_risk === "suspicious") {
            urlRisk.style.color = "#b42318";
        } else if (data.url_risk === "safe") {
            urlRisk.style.color = "#18794e";
        } else {
            urlRisk.style.color = "#555";
        }

        const signals = (data.text_analysis || []).filter(
            item => item.category !== "Non_Dark_Pattern"
        );

        if (signals.length === 0) {
            const item = document.createElement("li");
            item.innerText = "No dark-pattern categories predicted.";
            textSignals.appendChild(item);
        } else {
            signals.forEach(signal => {
                const item = document.createElement("li");
                item.innerText = `${signal.category}: "${signal.text}"`;
                textSignals.appendChild(item);
            });
        }

        const visual = data.visual_analysis;

        if (visual && visual.available) {
            const detected = [];

            if (visual.scarcity_detected) detected.push("Scarcity");
            if (visual.urgency_detected) detected.push("Urgency");
            if (visual.payment_detected) detected.push("Payment section");

            visualSignals.innerText = detected.length
                ? `Detected: ${detected.join(", ")}`
                : "No listed visual signals detected.";
        } else {
            visualSignals.innerText =
                "No screenshot supplied. Screenshot analysis has not run.";
        }

        aiStatus.innerText = "AI analysis completed.";
    } catch (error) {
        console.error("AI analysis failed:", error);

        aiStatus.innerText =
            "AI backend unavailable. Check that the Python server is running.";

        urlRisk.innerText = "Unavailable";
        textSignals.replaceChildren();

        const item = document.createElement("li");
        item.innerText = "Could not retrieve AI predictions.";
        textSignals.appendChild(item);

        visualSignals.innerText = "Not analyzed.";
    }
}