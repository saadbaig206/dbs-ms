import httpx
from app.core.config import settings

class WhatsAppService:
    @staticmethod
    async def send_message(to_phone: str, message_text: str) -> bool:
        if not settings.WHATSAPP_ACCESS_TOKEN or not settings.WHATSAPP_PHONE_NUMBER_ID:
            print("WhatsApp credentials missing in configuration. Skipping send.")
            return False

        url = f"https://graph.facebook.com/v18.0/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
        headers = {
            "Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",
            "Content-Type": "application/json"
        }
        
        # Clean phone number (remove +, spaces, leading zeroes if Meta requires it, but usually standard digits work)
        clean_phone = "".join(c for c in to_phone if c.isdigit())

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": clean_phone,
            "type": "text",
            "text": {
                "preview_url": False,
                "body": message_text
            }
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, headers=headers, json=payload, timeout=10.0)
                if response.status_code in (200, 201):
                    return True
                else:
                    print(f"Meta Graph API Error: {response.status_code} - {response.text}")
                    return False
            except Exception as e:
                print(f"Exception during Meta Graph API call: {e}")
                return False
