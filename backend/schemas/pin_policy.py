from __future__ import annotations


_DISALLOWED_PINS = {
    "0000",
    "1111",
    "2222",
    "3333",
    "4444",
    "5555",
    "6666",
    "7777",
    "8888",
    "9999",
    "0123",
    "1234",
    "2345",
    "3456",
    "4567",
    "5678",
    "6789",
    "7890",
    "0987",
    "9876",
    "8765",
    "7654",
    "6543",
    "5432",
    "4321",
    "3210",
}


def validate_transfer_pin_strength(pin: str) -> str:
    if not isinstance(pin, str):
        raise ValueError("Transfer PIN must be a string")

    if not pin.isdigit() or len(pin) != 4:
        raise ValueError("Transfer PIN must be exactly 4 digits")

    if pin in _DISALLOWED_PINS:
        raise ValueError("Transfer PIN is too easy to guess")

    if len(set(pin)) == 1:
        raise ValueError("Transfer PIN is too easy to guess")

    return pin
