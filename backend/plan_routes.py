from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import re

from database import get_db
from models import BroadbandPlan

router = APIRouter(prefix="/api/plans", tags=["Plans"])


def to_int(value: str) -> int | None:
    if not value:
        return None
    m = re.search(r"\d+", str(value))
    return int(m.group()) if m else None


@router.get("")
async def list_plans(db: Session = Depends(get_db)):
    plans = db.query(BroadbandPlan).all()
    result = []
    for p in plans:
        speed_mbps = to_int(p.speed)
        data_limit_gb = to_int(p.data_limit)
        result.append({
            "id": p.id,
            "name": p.name,
            "price": p.price,
            "speed_mbps": speed_mbps if speed_mbps is not None else p.speed,
            "data_limit_gb": data_limit_gb,  # null means Unlimited on UI
            "commitment": p.commitment,
        })
    return result