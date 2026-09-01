import os
from google import genai
from google.genai import types

def get_weather(location: str) -> str:
    """Gets the weather of a location"""
    return f"Weather in {location} is rainy."

client = genai.Client(api_key="DUMMY")

# Try parsing response for function calls
print(hasattr(types, 'FunctionCall'))
