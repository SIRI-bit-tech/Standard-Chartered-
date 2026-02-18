import ably
import inspect
from config import settings
from typing import Optional, Dict, Any
from datetime import datetime
import json

_ably_client: Optional[ably.AblyRest] = None


def _is_valid_ably_key(key: Optional[str]) -> bool:
    if not key:
        return False
    # Ably keys look like: "appId.keyId:secret"
    if ":" not in key:
        return False
    if "your-ably-api-key" in key.lower():
        return False
    return True


def _get_ably_client() -> Optional[ably.AblyRest]:
    global _ably_client
    if _ably_client is not None:
        return _ably_client

    key = getattr(settings, "ABLY_API_KEY", None)
    if not _is_valid_ably_key(key):
        return None

    try:
        _ably_client = ably.AblyRest(key)
        return _ably_client
    except Exception:
        return None


class AblyRealtimeManager:
    """Manage real-time updates via Ably"""
    
    CHANNELS = {
        "transactions": "banking:transactions",
        "accounts": "banking:accounts",
        "transfers": "banking:transfers",
        "loans": "banking:loans",
        "notifications": "banking:notifications",
        "cards": "banking:cards",
        "support": "banking:support",
        "admin_users": "admin:users",
        "admin_accounts": "admin:accounts",
        "admin_transactions": "admin:transactions",
        "admin_dashboard": "admin:dashboard",
        "admin_support": "admin:support",
    }
    
    @staticmethod
    def publish_transaction_update(
        user_id: str,
        account_id: str,
        transaction_data: Dict[str, Any]
    ) -> bool:
        """Publish transaction update to user's channel"""
        ably_client = _get_ably_client()
        if ably_client is None:
            return False
    
    @staticmethod
    def publish_admin_event(scope: str, payload: Dict[str, Any]) -> bool:
        ably_client = _get_ably_client()
        if ably_client is None:
            return False
        try:
            channel_name = AblyRealtimeManager.CHANNELS.get(f"admin_{scope}")
            if not channel_name:
                return False
            channel = ably_client.channels.get(channel_name)
            channel.publish("update", json.dumps({"scope": scope, "data": payload, "timestamp": datetime.utcnow().isoformat()}))
            return True
        except Exception:
            return False
        try:
            channel = ably_client.channels.get(f"{AblyRealtimeManager.CHANNELS['transactions']}:{user_id}")
            
            message_data = {
                "type": "transaction_update",
                "account_id": account_id,
                "transaction": transaction_data,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            channel.publish("update", json.dumps(message_data))
            return True
        except Exception as e:
            print(f"Error publishing transaction update: {e}")
            return False
    
    @staticmethod
    def publish_card_status_update(user_id: str, card_id: str, status: str, action: str) -> bool:
        ably_client = _get_ably_client()
        if ably_client is None:
            return False
        try:
            channel = ably_client.channels.get(f"{AblyRealtimeManager.CHANNELS['cards']}:{user_id}")
            message_data = {
                "type": "card_status",
                "card_id": card_id,
                "status": status,
                "action": action,
                "timestamp": datetime.utcnow().isoformat()
            }
            channel.publish("update", json.dumps(message_data))
            return True
        except Exception as e:
            print(f"Error publishing card status: {e}")
            return False
    
    @staticmethod
    def publish_balance_update(
        user_id: str,
        account_id: str,
        new_balance: float,
        currency: str
    ) -> bool:
        """Publish account balance update"""
        ably_client = _get_ably_client()
        if ably_client is None:
            return False
        try:
            channel = ably_client.channels.get(f"{AblyRealtimeManager.CHANNELS['accounts']}:{user_id}")
            
            message_data = {
                "type": "balance_update",
                "account_id": account_id,
                "new_balance": new_balance,
                "currency": currency,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            channel.publish("balance", json.dumps(message_data))
            return True
        except Exception as e:
            print(f"Error publishing balance update: {e}")
            return False
    
    @staticmethod
    def publish_transfer_status(
        user_id: str,
        transfer_id: str,
        status: str,
        details: Dict[str, Any]
    ) -> bool:
        """Publish transfer status update"""
        ably_client = _get_ably_client()
        if ably_client is None:
            return False
        try:
            channel = ably_client.channels.get(f"{AblyRealtimeManager.CHANNELS['transfers']}:{user_id}")
            
            message_data = {
                "type": "transfer_status",
                "transfer_id": transfer_id,
                "status": status,
                "details": details,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            channel.publish("status", json.dumps(message_data))
            return True
        except Exception as e:
            print(f"Error publishing transfer status: {e}")
            return False
    
    @staticmethod
    def publish_notification(
        user_id: str,
        notification_type: str,
        title: str,
        message: str,
        data: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Publish notification to user"""
        ably_client = _get_ably_client()
        if ably_client is None:
            return False
        try:
            channel = ably_client.channels.get(f"{AblyRealtimeManager.CHANNELS['notifications']}:{user_id}")
            
            message_data = {
                "type": notification_type,
                "title": title,
                "message": message,
                "data": data or {},
                "timestamp": datetime.utcnow().isoformat()
            }
            
            channel.publish("notification", json.dumps(message_data))
            return True
        except Exception as e:
            print(f"Error publishing notification: {e}")
            return False
    
    @staticmethod
    def publish_support_message(
        ticket_id: str,
        user_id: str,
        sender_name: str,
        message: str,
        is_agent: bool = False
    ) -> bool:
        """Publish support chat message"""
        ably_client = _get_ably_client()
        if ably_client is None:
            return False
        try:
            channel = ably_client.channels.get(f"{AblyRealtimeManager.CHANNELS['support']}:{ticket_id}")
            
            message_data = {
                "sender_id": user_id,
                "sender_name": sender_name,
                "message": message,
                "is_agent": is_agent,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            channel.publish("message", json.dumps(message_data))
            return True
        except Exception as e:
            print(f"Error publishing support message: {e}")
            return False
    
    @staticmethod
    def publish_loan_status_update(
        user_id: str,
        loan_id: str,
        status: str,
        details: Dict[str, Any]
    ) -> bool:
        """Publish loan status update"""
        ably_client = _get_ably_client()
        if ably_client is None:
            return False
        try:
            channel = ably_client.channels.get(f"{AblyRealtimeManager.CHANNELS['loans']}:{user_id}")
            
            message_data = {
                "type": "loan_status",
                "loan_id": loan_id,
                "status": status,
                "details": details,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            channel.publish("status", json.dumps(message_data))
            return True
        except Exception as e:
            print(f"Error publishing loan status: {e}")
            return False


async def get_ably_token_request(user_id: str) -> Optional[Dict[str, Any]]:
    """Generate Ably token request for client-side connection"""
    ably_client = _get_ably_client()
    if ably_client is None:
        return None
    try:
        token_request = ably_client.auth.create_token_request(
            {
                "client_id": user_id,
                "capability": {
                    f"banking:transactions:{user_id}": ["subscribe", "publish"],
                    f"banking:accounts:{user_id}": ["subscribe"],
                    f"banking:transfers:{user_id}": ["subscribe"],
                    f"banking:loans:{user_id}": ["subscribe"],
                    f"banking:notifications:{user_id}": ["subscribe"],
                    f"banking:cards:{user_id}": ["subscribe"],
                }
            }
        )
        if inspect.isawaitable(token_request):
            token_request = await token_request
        return token_request
    except Exception as e:
        print(f"Error creating token request: {e}")
        return None

async def get_admin_ably_token_request(admin_id: str) -> Optional[Dict[str, Any]]:
    ably_client = _get_ably_client()
    if ably_client is None:
        return None
    try:
        token_request = ably_client.auth.create_token_request(
            {
                "client_id": f"admin:{admin_id}",
                "capability": {
                    "admin:users": ["subscribe"],
                    "admin:accounts": ["subscribe"],
                    "admin:transactions": ["subscribe"],
                    "admin:dashboard": ["subscribe"],
                    "admin:support": ["subscribe"],
                }
            }
        )
        if inspect.isawaitable(token_request):
            token_request = await token_request
        return token_request
    except Exception:
        return None
