import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "isp_management.db")

print(f"Connecting to: {DB_PATH}")

try:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check if column exists
    cursor.execute("PRAGMA table_info(users)")
    columns = [info[1] for info in cursor.fetchall()]
    
    if "invoice_remarks" in columns:
        print("Column 'invoice_remarks' already exists.")
    else:
        print("Adding column 'invoice_remarks'...")
        cursor.execute("ALTER TABLE users ADD COLUMN invoice_remarks TEXT")
        conn.commit()
        print("Success: Column added.")
        
except sqlite3.Error as e:
    print(f"SQLite Error: {e}")
except Exception as e:
    print(f"Error: {e}")
finally:
    if 'conn' in locals():
        conn.close()
