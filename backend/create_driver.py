"""
One-shot script: Create a driver account for donaga7559@archifun.com
Run from the backend/ directory with the DATABASE_URL set:

  DATABASE_URL=<your-render-internal-url> python create_driver.py

Or directly with: python create_driver.py (reads from .env)
"""
import asyncio
import secrets
import string
import os

import bcrypt
from dotenv import load_dotenv

load_dotenv()

EMAIL       = "donaga7559@archifun.com"
FULL_NAME   = "Test Driver"
ROLE        = "driver"
PASSWORD    = "FleetOS2026!"   # Change this to whatever you want


def generate_account_code() -> str:
    chars = string.ascii_uppercase + string.digits
    return "FLT-" + "".join(secrets.choice(chars) for _ in range(6))


async def main():
    raw_url = os.environ.get("DATABASE_URL", "")
    if not raw_url:
        print("ERROR: DATABASE_URL not set. Check your .env or set it in the environment.")
        return

    # Normalise URL for asyncpg
    url = raw_url
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    if url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql+asyncpg://", "postgresql://", 1)

    import asyncpg

    conn = await asyncpg.connect(url)
    try:
        # Check if user already exists
        row = await conn.fetchrow("SELECT id, email, role FROM users WHERE email = $1", EMAIL)
        if row:
            print(f"Account already exists: id={row['id']}, role={row['role']}")
            print("No changes made.")
            return

        # Hash the password
        pw_hash = bcrypt.hashpw(PASSWORD.encode(), bcrypt.gensalt()).decode()
        account_code = generate_account_code()

        # Insert the user
        new_id = await conn.fetchval(
            """
            INSERT INTO users (email, password_hash, full_name, role, account_code, is_recording_enabled)
            VALUES ($1, $2, $3, $4, $5, true)
            RETURNING id
            """,
            EMAIL, pw_hash, FULL_NAME, ROLE, account_code
        )

        print(f"Driver account created!")
        print(f"  Email        : {EMAIL}")
        print(f"  Password     : {PASSWORD}")
        print(f"  Role         : {ROLE}")
        print(f"  Account code : {account_code}")
        print(f"  DB id        : {new_id}")
        print()
        print("The driver can now log in at the fleet app and use the GPS simulator.")
        print("They will need a vehicle owner to share their pairing code OR account code.")

    finally:
        await conn.close()


asyncio.run(main())
