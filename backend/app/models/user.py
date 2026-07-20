from typing import TypedDict, Any

class User(TypedDict, total=False):
    id: str
    _id: Any
    # Fields dynamically used as dict
