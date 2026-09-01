import os
from google import genai
from google.genai import types

def get_weather(location: str) -> str:
    """Gets the weather of a location"""
    return f"Weather in {location} is rainy."

tools = [{"functionDeclarations": [{"name": "get_weather", "description": "Gets weather"}]}]

print("Testing pure dicts without library tools wrapper")
