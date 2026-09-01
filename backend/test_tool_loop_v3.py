import os
from google import genai
from google.genai import types

def get_weather(location: str) -> str:
    """Gets the weather of a location."""
    if location == "Paris":
        return "Rainy, 15C"
    return "Sunny, 25C"

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

contents = ["What is the weather in Paris?"]
tools = [get_weather]

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=contents,
    config=types.GenerateContentConfig(tools=tools)
)

print("Function calls:", response.function_calls)
if response.function_calls:
    # Append model's response part to contents
    # Wait, response.candidates[0].content contains the parts
    contents.append(response.candidates[0].content)

    # Execute function
    fc = response.function_calls[0]
    func_name = fc.name
    args = fc.args
    print("Calling:", func_name, "with", args)

    result = get_weather(**args)

    # Create function response part
    func_resp = types.Part.from_function_response(
        name=func_name,
        response={"result": result}
    )

    # Append function response to contents
    contents.append(func_resp)

    # Call again
    response2 = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=contents,
        config=types.GenerateContentConfig(tools=tools)
    )
    print("Final response:", response2.text)
