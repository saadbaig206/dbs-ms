import httpx
from typing import List, Dict
from app.core.config import settings

class GroqService:
    @staticmethod
    async def get_reply(
        history: List[Dict[str, str]], 
        system_prompt: str, 
        knowledge_base: str
    ) -> str:
        if not settings.GROQ_API_KEY:
            # Fallback if no Groq API Key is configured
            return "Hello! Thank you for contacting DBS Aesthetics Clinic. Our staff will get back to you shortly."

        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
            "Content-Type": "application/json"
        }

        # Build full system prompt incorporating the knowledge base
        full_system_instruction = (
            f"{system_prompt}\n\n"
            f"Here is the clinic's official information / knowledge base:\n"
            f"{knowledge_base}\n\n"
            f"Answer the customer's questions strictly based on the information provided above. "
            f"If you do not know the answer, politely say that a human representative will follow up."
        )

        messages = [{"role": "system", "content": full_system_instruction}]
        
        # Add conversation history (up to last 10 messages for context)
        for msg in history[-10:]:
            messages.append({
                "role": "user" if msg["role"] == "user" else "assistant",
                "content": msg["content"]
            })

        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": messages,
            "temperature": 0.3,
            "max_tokens": 512
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, headers=headers, json=payload, timeout=15.0)
                if response.status_code == 200:
                    data = response.json()
                    return data["choices"][0]["message"]["content"]
                else:
                    print(f"Groq API Error: {response.status_code} - {response.text}")
                    return "Thank you for your message. We have received it and will reply soon."
            except Exception as e:
                print(f"Exception during Groq API call: {e}")
                return "Thank you for your message. We have received it and will reply soon."
