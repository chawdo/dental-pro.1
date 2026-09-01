import os
from google import genai
from google.genai import types

def get_weather(location: str) -> str:
    """Gets the weather of a location."""
    if location == "Paris":
        return "Rainy, 15C"
    return "Sunny, 25C"

client = genai.Client(api_key="DUMMY")
print("We know tools are passed in generate_content or chat. Chats loop is probably easier but the prompt asked for client.models.generate_content.")
