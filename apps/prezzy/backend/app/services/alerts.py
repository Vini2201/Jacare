import httpx
import logging
from app.core.config import settings
import smtplib
from email.message import EmailMessage

logger = logging.getLogger(__name__)

class AlertService:
    @staticmethod
    async def send_telegram_message(message: str):
        if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHAT_ID:
            logger.warning("Telegram alerts not configured.")
            return

        url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
        payload = {
            "chat_id": settings.TELEGRAM_CHAT_ID,
            "text": message,
            "parse_mode": "HTML"
        }
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload)
                response.raise_for_status()
        except Exception as e:
            logger.error(f"Failed to send Telegram alert: {e}")

    @staticmethod
    def send_email_alert(subject: str, body: str):
        if not settings.SMTP_HOST or not settings.SMTP_USER or not settings.ADMIN_EMAIL:
            logger.warning("Email alerts not configured.")
            return

        try:
            msg = EmailMessage()
            msg.set_content(body)
            msg['Subject'] = subject
            msg['From'] = settings.SMTP_USER
            msg['To'] = settings.ADMIN_EMAIL

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
        except Exception as e:
            logger.error(f"Failed to send Email alert: {e}")

    @classmethod
    async def alert_admin(cls, subject: str, message: str, level: str = "INFO"):
        emoji = "ℹ️"
        if level == "WARNING":
            emoji = "⚠️"
        elif level == "ERROR":
            emoji = "🚨"
            
        full_message = f"{emoji} <b>PREZZY {level}</b>\n\n<b>{subject}</b>\n\n{message}"
        
        # Send to Telegram
        await cls.send_telegram_message(full_message)
        
        # Send Email if it's an error or warning
        if level in ["WARNING", "ERROR"]:
            cls.send_email_alert(f"[{level}] PREZZY: {subject}", message)
