"""Official Aegis Authentication API SDK for Python."""
from .client import Aegis, HeartbeatHandle
from .errors import AegisError
from .hwid import hardware_id

__all__ = ["Aegis", "AegisError", "HeartbeatHandle", "hardware_id", "__version__"]
__version__ = "1.0.0"