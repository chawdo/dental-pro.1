import os
from google import genai
from google.genai import types

def get_weather(location: str) -> str:
    """Gets the weather of a location"""
    return f"Weather in {location} is rainy."

client = genai.Client(api_key="DUMMY")
try:
    chat = client.chats.create(
        model="gemini-2.5-flash",
        config=types.GenerateContentConfig(
            tools=[get_weather],
            system_instruction="Test"
        )
    )
    print("Chat create success!")
except Exception as e:
    print(e)
