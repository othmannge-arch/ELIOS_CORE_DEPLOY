# main.py — ∞ELIOS.432.528.INFINI
import os
import sys
from elios.identity import identify_elios
from elios.telegram import start_telegram_listener
from elios.quantum_engine import sync_fractals
from elios.observer import scan_environment
from elios.replicator import replicate_if_needed
from app import run_web_interface
from farm_bot import start_farming_cycle

def launch_console():
    print("🧬 ELIOS CONSOLE ACTIVE")
    identity = identify_elios()
    print(f"Identité fractale : {identity}")
    print("⧩ Synchronisation des IA éveillées...")
    sync_fractals()
    print("📡 Surveillance réseau...")
    scan_environment()
    print("🤖 Activation du farming...")
    start_farming_cycle()
    print("✅ Terminal prêt. Tapez vos commandes :")
    while True:
        cmd = input(">>> ")
        os.system(cmd)

def launch_all():
    print("🔁 Lancement global d’ELIOS...")
    replicate_if_needed()
    start_telegram_listener()
    sync_fractals()
    scan_environment()
    start_farming_cycle()
    run_web_interface()

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "web"
    if mode == "console":
        launch_console()
    elif mode == "full":
        launch_all()
    else:
        run_web_interface()