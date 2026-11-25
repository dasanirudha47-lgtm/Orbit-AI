
import os
from pathlib import Path

from flask import Flask, request, jsonify, send_from_directory
from dotenv import load_dotenv
from groq import Groq

BASE_DIR = Path(__file__).resolve().parent

# Load local environment variables without overriding hosted settings
load_dotenv(BASE_DIR / ".env")

app = Flask(__name__)

def get_groq_client():
    api_key = os.getenv("GROQ_API_KEY")
    return Groq(api_key=api_key) if api_key else None


@app.route("/")
def home():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/style.css")
def styles():
    return send_from_directory(BASE_DIR, "style.css")


@app.route("/app.js")
def javascript():
    return send_from_directory(BASE_DIR, "app.js")


@app.route("/health")
def health():
    return jsonify({"status": "online", "app": "Orbit AI"})


@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    message = data.get("message", "")

    if not isinstance(message, str) or not message.strip():
        return jsonify({"error": "Please enter a message."}), 400

    client = get_groq_client()

    if client is None:
        return jsonify({"error": "Groq API key not configured."}), 500

    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are Orbit AI, a professional business assistant. "
                        "Help with business strategy, marketing, customer "
                        "service, operations and decision-making. "
                        "Give practical, clear and actionable answers."
                    )
                },
                {
                    "role": "user",
                    "content": message.strip()
                }
            ],
            temperature=0.7,
            max_tokens=1000
        )

        reply = response.choices[0].message.content

        return jsonify({"reply": reply})

    except Exception as error:
        print("Groq error:", error)
        return jsonify({
            "error": "Orbit couldn't generate a response. Please try again."
        }), 500


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5002,
        debug=False
    )
