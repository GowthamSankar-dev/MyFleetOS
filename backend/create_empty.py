import asyncio
import asyncpg

async def main():
    try:
        conn = await asyncpg.connect('postgresql://fleet_user:fleet_pass@localhost:5432/postgres')
        # Drop if exists
        try:
            await conn.execute('DROP DATABASE empty_db')
        except:
            pass
        await conn.execute('CREATE DATABASE empty_db')
        await conn.close()
        print("Empty DB created successfully")
    except Exception as e:
        print("Error:", e)

asyncio.run(main())
