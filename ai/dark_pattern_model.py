
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, classification_report


# 1. Load the dataset
data = pd.read_csv("ai/dark_pattern_dataset.csv")

print("Dataset loaded successfully!")
print("Number of examples:", len(data))
print()


# 2. Separate text and labels
X = data["text"]
y = data["label"]


# 3. Split the dataset into training and testing data
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


# 4. Create the machine-learning pipeline
model = Pipeline([
    (
        "tfidf",
        TfidfVectorizer(
            lowercase=True,
            ngram_range=(1, 2)
        )
    ),
    (
        "classifier",
        LogisticRegression(
            max_iter=1000
        )
    )
])


# 5. Train the model
model.fit(X_train, y_train)

print("Model training completed!")
print()


# 6. Test the model
predictions = model.predict(X_test)

accuracy = accuracy_score(y_test, predictions)

print("Accuracy:", accuracy)
print()


# 7. Detailed evaluation
print("Classification Report:")
print(classification_report(y_test, predictions, zero_division=0))


# 8. Test completely new checkout text
test_sentences = [
    "ONLY 2 LEFT!",
    "Hurry! Offer ends tonight!",
    "Thousands of customers bought this!",
    "Delivery fee: ₹100",
    "Choose our recommended option"
]


print("Predictions for new text:")
print()


for sentence in test_sentences:

    prediction = model.predict([sentence])[0]

    print("Text:", sentence)
    print("Predicted category:", prediction)
    print()