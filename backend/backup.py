import shutil
from pathlib import Path
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


def create_daily_backup():
    """
    Create daily backup of SQLite database
    Runs at 2:00 AM via scheduler or on app startup/shutdown
    """
    
    logger.info("💾 Creating database backup...")
    
    try:
        # Source database file
        db_file = Path("isp_management.db")
        
        if not db_file.exists():
            logger.warning("⚠️  Database file not found, skipping backup")
            return {
                "success": False,
                "message": "Database file not found"
            }
        
        # Backup directory
        backup_dir = Path("backups")
        backup_dir.mkdir(exist_ok=True)
        
        # Create backup filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = backup_dir / f"isp_management_backup_{timestamp}.db"
        
        # Copy database file
        shutil.copy2(db_file, backup_file)
        
        # Get backup size
        size_mb = backup_file.stat().st_size / (1024 * 1024)
        
        logger.info(f"✅ Backup created: {backup_file.name} ({size_mb:.2f} MB)")
        
        # Keep only last 30 backups
        cleanup_old_backups(backup_dir, keep_count=30)
        
        return {
            "success": True,
            "backup_file": str(backup_file),
            "size_mb": round(size_mb, 2),
            "message": "Backup created successfully"
        }
        
    except Exception as e:
        logger.error(f"❌ Backup failed: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


def cleanup_old_backups(backup_dir: Path, keep_count: int = 30):
    """Delete old backups, keeping only the most recent ones"""
    
    try:
        # Get all backup files sorted by modification time
        backups = sorted(
            backup_dir.glob("isp_management_backup_*.db"),
            key=lambda p: p.stat().st_mtime,
            reverse=True
        )
        
        # Delete old backups beyond keep_count
        deleted_count = 0
        for old_backup in backups[keep_count:]:
            old_backup.unlink()
            deleted_count += 1
        
        if deleted_count > 0:
            logger.info(f"🗑️  Deleted {deleted_count} old backup(s)")
            
    except Exception as e:
        logger.warning(f"⚠️  Error cleaning up old backups: {str(e)}")


if __name__ == "__main__":
    # Allow manual execution
    result = create_daily_backup()
    print(result)