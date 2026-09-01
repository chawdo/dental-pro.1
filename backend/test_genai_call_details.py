import os
from google import genai
from google.genai import types

def get_weather(location: str) -> str:
    """Gets the weather of a location"""
    return f"Weather in {location} is rainy."

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY", "DUMMY"))
try:
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents="What is the weather in Paris?",
        config=types.GenerateContentConfig(
            tools=[get_weather],
        )
    )
    print("Response text:", response.text)
    print("Function calls:", response.function_calls)
except Exception as e:
    print("Error:", e)
