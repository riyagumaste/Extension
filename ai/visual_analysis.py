import pytesseract
from PIL import Image


# Tell Python where Tesseract is installed
pytesseract.pytesseract.tesseract_cmd = (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)


# Screenshot path
image_path = "ai/visual_test_case/urgent.png"


# Open screenshot
image = Image.open(image_path)


# Extract text using OCR
text = pytesseract.image_to_string(image)


# Convert text to lowercase for easier checking
text_lower = text.lower()


print("===== VISUAL ANALYSIS =====")
print()

print("Extracted text:")
print(text)

print("===========================")
print()

# -----------------------------
# Detect visual/textual signals
# -----------------------------

scarcity_words = [
    "only",
    "left",
    "remaining",
    "limited",
    "sold out",
    "almost sold out"
]

urgency_words = [
    "hurry",
    "ends in",
    "ends soon",
    "expires",
    "act now",
    "limited time"
]

payment_words = [
    "payment",
    "card number",
    "cvv",
    "pay now",
    "payment details"
]


# Detect scarcity
scarcity_detected = any(
    word in text_lower
    for word in scarcity_words
)


# Detect urgency
urgency_detected = any(
    word in text_lower
    for word in urgency_words
)


# Detect payment area
payment_detected = any(
    word in text_lower
    for word in payment_words
)


print("===== VISUAL RISK ANALYSIS =====")
print()

print(
    "Scarcity signal:",
    "DETECTED" if scarcity_detected else "NOT DETECTED"
)

print(
    "Urgency signal:",
    "DETECTED" if urgency_detected else "NOT DETECTED"
)

print(
    "Payment section:",
    "DETECTED" if payment_detected else "NOT DETECTED"
)

print()

print("Potential visual risk signals:")

if scarcity_detected:
    print("- Scarcity")

if urgency_detected:
    print("- Urgency")

if not scarcity_detected and not urgency_detected:
    print("- No major scarcity/urgency signals detected")

print()
print("==============================")