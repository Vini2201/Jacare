import asyncio
import logging
from typing import Optional, Dict, Any
from app.api.auth import get_supabase_client
from app.services.alerts import AlertService

logger = logging.getLogger(__name__)

class EventDispatcher:
    """
    Central Event Dispatcher.
    Responsible for auditing events into the Supabase 'admin_audit_logs' table
    and firing Telegram/Email alerts asynchronously in a fire-and-forget manner.
    """

    @staticmethod
    async def dispatch(
        category: str,
        severity: str,
        event_type: str,
        message: str,
        user_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Public method to dispatch an event without blocking the main request.
        Uses asyncio.create_task for fire-and-forget execution.
        """
        asyncio.create_task(
            EventDispatcher._process_event(category, severity, event_type, message, user_id, metadata)
        )

    @staticmethod
    async def _process_event(
        category: str,
        severity: str,
        event_type: str,
        message: str,
        user_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Internal background method."""
        try:
            # 1. Log to Database
            supabase = get_supabase_client()
            log_data = {
                "category": category,
                "severity": severity,
                "event_type": event_type,
                "message": message,
                "metadata": metadata or {}
            }
            if user_id:
                log_data["user_id"] = user_id
            
            supabase.table("admin_audit_logs").insert(log_data).execute()

            # 2. Telegram Alert Formatting
            # Send to Telegram if severity is warning or critical, or if it's a specific interesting event
            # In a real app, we would query the Superuser's `notify_preferences` here.
            should_alert = severity in ["warning", "critical"] or category in ["billing", "auth"]

            if should_alert:
                emoji_map = {
                    "info": "🔵",
                    "warning": "⚠️",
                    "critical": "🚨"
                }
                cat_emoji = {
                    "auth": "🔐",
                    "admin": "👤",
                    "ai": "🧠",
                    "billing": "💰",
                    "storage": "📦",
                    "system": "⚙️"
                }
                
                e_sev = emoji_map.get(severity, "🔵")
                e_cat = cat_emoji.get(category, "📌")
                
                user_label = f"User: <code>{user_id}</code>" if user_id else "User: System"
                
                tg_message = f"{e_sev} <b>{severity.upper()}</b> | {e_cat} <b>{category.upper()}</b>\n"
                tg_message += f"<b>Event:</b> <code>{event_type}</code>\n"
                tg_message += f"{user_label}\n\n"
                tg_message += f"<b>Detalhes:</b>\n{message}"

                await AlertService.send_telegram_message(tg_message)

            # 3. Email for Critical Events
            if severity == "critical":
                email_subject = f"[{category.upper()}] CRITICAL: {event_type}"
                AlertService.send_email_alert(email_subject, message)

        except Exception as e:
            # We fail silently so it never breaks the system
            logger.error(f"EventDispatcher Failed: {str(e)}")
