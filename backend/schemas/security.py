from pydantic import BaseModel
from typing import Optional, Dict, Any

class WebAuthnRegisterStartResponse(BaseModel):
    success: bool
    user_id: str
    public_key_credential_creation_options: str # JSON string from Stytch

class WebAuthnRegisterRequest(BaseModel):
    credential_id: str
    public_key_credential: str # JSON string from navigator.credentials.create()

class WebAuthnAuthenticateStartResponse(BaseModel):
    success: bool
    user_id: str
    public_key_credential_request_options: str # JSON string from Stytch

class WebAuthnAuthenticateRequest(BaseModel):
    email: Optional[str] = None
    credential_id: str
    public_key_credential: str # JSON string from navigator.credentials.get()
