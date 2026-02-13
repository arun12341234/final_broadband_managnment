import sqlite3
import os

DB_PATH = "isp_management.db"

def check_data():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT full_name, mobile_no_1, mobile_no_2, telephone_no FROM billing_settings ORDER BY id DESC LIMIT 1")
        row = cursor.fetchone()
        
        if row:
            print("Current Billing Settings in DB:")
            print(f"Name: {row[0]}")
            print(f"Mobile 1: '{row[1]}'")
            print(f"Mobile 2: '{row[2]}'")
            print(f"Telephone: '{row[3]}'")
        else:
            print("No billing settings found.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    check_data()
