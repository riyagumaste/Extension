import base64
import io
import re
import platform
from pathlib import Path
from urllib.parse import urlparse

import pandas as pd
import pytesseract
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS

from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier


# Project paths
BASE_DIR = Path(__file__).resolve().parent.parent
AI_DIR = BASE_DIR / "ai"

app = Flask(__name__)
CORS(app)

if platform.system() == "Windows":
    pytesseract.pytesseract.tesseract_cmd = (
        r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    )
else:
    pytesseract.pytesseract.tesseract_cmd = (
        "/opt/homebrew/bin/tesseract"
    )
# -----------------------------
# 1. Train text detection model
# -----------------------------

text_data = pd.read_csv(AI_DIR / "dark_pattern_dataset.csv")

text_model = Pipeline([
    ("tfidf", TfidfVectorizer(
        lowercase=True,
        ngram_range=(1, 2)
    )),
    ("classifier", LogisticRegression(max_iter=1000))
])

text_model.fit(text_data["text"], text_data["label"])


# -----------------------------
# 2. Extract URL features
# -----------------------------

def extract_url_features(url):
    parsed = urlparse(url)

    hostname = parsed.hostname or ""
    path = parsed.path or ""
    query = parsed.query or ""

    return {
        "url_length": len(url),
        "hostname_length": len(hostname),
        "path_length": len(path),
        "number_of_dots": hostname.count("."),
        "number_of_subdomains": max(
            0, len(hostname.split(".")) - 2
        ),
        "number_of_digits": sum(c.isdigit() for c in url),
        "number_of_special_chars": len(
            re.findall(r"[^a-zA-Z0-9]", url)
        ),
        "uses_https": int(parsed.scheme == "https"),
        "number_of_query_parameters": (
            0 if not query else query.count("&") + 1
        )
    }


# -----------------------------
# 3. Train URL risk model
# -----------------------------

url_data = pd.read_csv(AI_DIR / "url_test_data.csv")

url_features = pd.DataFrame(
    url_data["url"].apply(
        extract_url_features
    ).tolist()
)

url_model = RandomForestClassifier(
    n_estimators=100,
    random_state=42
)

url_model.fit(url_features, url_data["label"])


# -----------------------------
# 4. Visual OCR analysis
# -----------------------------

SCARCITY_WORDS = [
    "only", "left", "remaining", "limited",
    "sold out", "almost sold out"
]

URGENCY_WORDS = [
    "hurry", "ends in", "ends soon",
    "expires", "act now", "limited time"
]

PAYMENT_WORDS = [
    "payment", "card number", "cvv",
    "pay now", "payment details"
]


def analyze_visual(image_base64):
    if not image_base64:
        return {"available": False}

    # Accept a base64 image or a data URL
    if "," in image_base64:
        image_base64 = image_base64.split(",", 1)[1]

    image_bytes = base64.b64decode(image_base64)
    image = Image.open(io.BytesIO(image_bytes))
    extracted_text = pytesseract.image_to_string(image)
    lowered = extracted_text.lower()

    return {
        "available": True,
        "extracted_text": extracted_text,
        "scarcity_detected": any(
            word in lowered for word in SCARCITY_WORDS
        ),
        "urgency_detected": any(
            word in lowered for word in URGENCY_WORDS
        ),
        "payment_detected": any(
            word in lowered for word in PAYMENT_WORDS
        )
    }


# -----------------------------
# 5. Combined analysis endpoint
# -----------------------------

@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json(silent=True) or {}

    page_text = str(data.get("text", ""))[:50000]
    url = str(data.get("url", ""))[:4096]
    screenshot = data.get("screenshot")

    text_predictions = []

    if page_text.strip():
        # Return one predicted category per sentence/line
        samples = [
            line.strip()
            for line in page_text.splitlines()
            if line.strip()
        ][:200]

        for sample in samples:
            category = text_model.predict([sample])[0]
            text_predictions.append({
                "text": sample,
                "category": str(category)
            })

    url_result = None

    if url:
        parsed = urlparse(url)

        if parsed.scheme in ("http", "https") and parsed.hostname:
            features = pd.DataFrame([
                extract_url_features(url)
            ])

            url_result = str(url_model.predict(features)[0])
        else:
            url_result = "invalid_url"

    try:
        visual_result = analyze_visual(screenshot)
    except Exception as exc:
        visual_result = {
            "available": False,
            "error": str(exc)
        }

    return jsonify({
        "text_analysis": text_predictions,
        "url_risk": url_result,
        "visual_analysis": visual_result
    })


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ready"})


if __name__ == "__main__":
    print("AI models loaded and trained.")
    print("Backend: http://127.0.0.1:5000")
    app.run(host="127.0.0.1", port=5000, debug=False)