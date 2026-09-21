import pandas as pd
import re

from urllib.parse import urlparse
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report


# 1. Extract features from a URL
def extract_url_features(url):

    parsed = urlparse(url)

    hostname = parsed.hostname or ""
    path = parsed.path or ""
    query = parsed.query or ""

    features = {
        "url_length": len(url),

        "hostname_length": len(hostname),

        "path_length": len(path),

        "number_of_dots": hostname.count("."),

        "number_of_subdomains":
            max(0, len(hostname.split(".")) - 2),

        "number_of_digits":
            sum(char.isdigit() for char in url),

        "number_of_special_chars":
            len(re.findall(r"[^a-zA-Z0-9]", url)),

        "uses_https":
            int(parsed.scheme == "https"),

        "number_of_query_parameters":
            0 if not query else query.count("&") + 1
    }

    return features


# 2. Load the dataset
data = pd.read_csv("ai/url_test_data.csv")

print("URL dataset loaded successfully!")
print("Number of URLs:", len(data))
print()


# 3. Convert URLs into numerical features
features = data["url"].apply(extract_url_features)

X = pd.DataFrame(features.tolist())
y = data["label"]


print("URL features extracted successfully!")
print()


# 4. Split into training and testing data
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.3,
    random_state=42,
    stratify=y
)

print("Training examples:", len(X_train))
print("Testing examples:", len(X_test))
print()


# 5. Create the machine-learning model
model = RandomForestClassifier(
    n_estimators=100,
    random_state=42
)


# 6. Train the model
model.fit(X_train, y_train)

print("URL risk model training completed!")
print()


# 7. Evaluate the model
predictions = model.predict(X_test)

accuracy = accuracy_score(y_test, predictions)

print("Accuracy:", accuracy)
print()


print("Classification Report:")
print(classification_report(
    y_test,
    predictions,
    zero_division=0
))


# 8. Test new URLs
test_urls = [
    "https://example.com/checkout",
    "https://shop.example.com/payment",
    "http://secure-login.example.test/verify",
    "http://example.test/login"
]


print("Predictions for new URLs:")
print()


for url in test_urls:

    features = extract_url_features(url)

    input_data = pd.DataFrame([features])

    prediction = model.predict(input_data)[0]

    print("URL:", url)
    print("Predicted risk:", prediction)
    print()
    