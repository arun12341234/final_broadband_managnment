import sqlite3
import os

DB_PATH = "isp_management.db"

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Check if columns exist
        cursor.execute("PRAGMA table_info(billing_settings)")
        columns = [info[1] for info in cursor.fetchall()]

        new_columns = [
            ("mobile_no_1", "VARCHAR(15)"),
            ("mobile_no_2", "VARCHAR(15)"),
            ("telephone_no", "VARCHAR(15)")
        ]

        for col_name, col_type in new_columns:
            if col_name not in columns:
                print(f"Adding column {col_name}...")
                cursor.execute(f"ALTER TABLE billing_settings ADD COLUMN {col_name} {col_type}")
            else:
                print(f"Column {col_name} already exists.")

        conn.commit()
        print("Migration completed successfully.")

    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
