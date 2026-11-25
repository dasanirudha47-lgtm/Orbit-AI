
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from groq import Groq

from pathlib import Path

env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path, override=True)

app = Flask(__name__)
CORS(app)

api_key = os.getenv("GROQ_API_KEY")
client = Groq(api_key=api_key) if api_key else None

@app.route("/")
def home():
    return jsonify({
        "message": "Orbit AI is online!",
        "status": "online"
    })

@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json() or {}
    message = data.get("message", "").strip()

    if not message:
        return jsonify({"error": "Please enter a message."}), 400

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
                    "content": message
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
    app.run(debug=True, port=5002)
