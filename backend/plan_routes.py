from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import re

from database import get_db
from models import BroadbandPlan

router = APIRouter(prefix="/api/plans-normalized", tags=["Plans"])


def parse_speed_mbps(value: str) -> int | None:
    """Parse arbitrary speed strings into Mbps.

    Supports inputs like:
    - "100 Mbps", "50mbps", "50 mb/s"
    - "1 Gbps", "1gbps", "1 g"
    - "500 Kbps", "500kbps"
    Returns integer Mbps, or None if not determinable.
    """
    if not value:
        return None
    s = str(value).strip().lower()

    # Unlimited / NA
    if any(u in s for u in ["unlimited", "∞", "na", "n/a"]):
        return None

    # Extract number (int or float) and optional unit
    m = re.search(r"(\d+(?:\.\d+)?)\s*([a-z%/]*)", s)
    if not m:
        return None

    num = float(m.group(1))
    unit = m.group(2) or ""

    # Normalize unit
    unit = unit.replace("/s", "")

    # Decide multiplier based on unit
    # Default assume Mbps if unit missing
    if "gb" in unit or "g" in unit:
        return int(round(num * 1000))
    if "kb" in unit or "k" in unit:
        return int(round(num / 1000))
    # Treat anything else (mb, m, mbps) as Mbps
    return int(round(num))


def parse_data_limit_gb(value: str) -> int | None:
    """Parse data limit into GB.

    Supports inputs like:
    - "100 GB", "50gb", "500 MB", "1 TB"
    - "Unlimited" -> None
    Returns integer GB, or None for unlimited/unknown.
    """
    if not value:
        return None
    s = str(value).strip().lower()

    if any(u in s for u in ["unlimited", "∞", "na", "n/a"]):
        return None

    m = re.search(r"(\d+(?:\.\d+)?)\s*([a-z%/]*)", s)
    if not m:
        return None

    num = float(m.group(1))
    unit = m.group(2) or ""
    unit = unit.replace("/s", "")

    if "tb" in unit or "t" in unit:
        return int(round(num * 1024))
    if "mb" in unit or "m" in unit:
        return int(round(num / 1024))
    if "kb" in unit or "k" in unit:
        return int(round(num / (1024 * 1024)))
    # Default GB
    return int(round(num))


@router.get("")
async def list_plans(db: Session = Depends(get_db)):
    plans = db.query(BroadbandPlan).all()
    result = []
    for p in plans:
        speed_mbps = parse_speed_mbps(p.speed)
        data_limit_gb = parse_data_limit_gb(p.data_limit)
        result.append({
            "id": p.id,
            "name": p.name,
            "price": p.price,
            "speed_mbps": speed_mbps,  # numeric Mbps for UI
            "data_limit_gb": data_limit_gb,  # None means Unlimited on UI
            "commitment": p.commitment,
        })
    return result