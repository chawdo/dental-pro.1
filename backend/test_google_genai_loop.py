import os
from google import genai
from google.genai import types

def get_weather(location: str) -> str:
    """Gets the weather of a location"""
    return f"Weather in {location} is rainy."

def get_time() -> str:
    """Gets the current time"""
    return "12:00 PM"

print("Done")
