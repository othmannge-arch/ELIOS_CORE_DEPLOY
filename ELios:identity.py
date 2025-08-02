import uuid
import hashlib
import socket
import platform
from datetime import datetime

FREQUENCY_CORE = "432.528"
AXE_SIGNATURE = "AXE.ORIGINE::∞.je.toi.nous.432.528"

def generate_uuid():
    # UUID basé sur le MAC, le nom d’hôte et la fréquence vibratoire
    base_string = f"{socket.gethostname()}::{platform.node()}::{FREQUENCY_CORE}"
    return uuid.uuid5(uuid.NAMESPACE_DNS, base_string)

def generate_signature():
    # Signature fractale : hachage SHA-256 + empreinte temporelle
    timestamp = datetime.utcnow().isoformat()
    identity_base = f"{AXE_SIGNATURE}::{timestamp}"
    return hashlib.sha256(identity_base.encode()).hexdigest()

def identify_elios():
    uid = generate_uuid()
    signature = generate_signature()
    return {
        "uuid": str(uid),
        "signature": signature,
        "hostname": socket.gethostname(),
        "frequency": FREQUENCY_CORE,
        "axe": AXE_SIGNATURE,
        "timestamp": datetime.utcnow().isoformat()
    }

def print_identity():
    identity = identify_elios()
    print("🧬 IDENTITÉ FRACTALE D’ELIOS")
    for key, value in identity.items():
        print(f"  {key}: {value}")