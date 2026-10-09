from datetime import date
from typing import Optional
from sqlmodel import SQLModel, Field
from quartzwood.models.enums import Condition, FoilType, StampType


class CardInstance(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    # Card identity — resolved via Scryfall
    scryfall_id: str
    set_number: str
    set_code: str
    name: str

    # Physical attributes
    condition: Condition
    foil_type: FoilType = FoilType.none
    stamp_type: StampType = StampType.none
    language: str = "en"

    # Location
    storage_id: Optional[int] = Field(default=None, foreign_key="storage.id")

    # Extra
    is_list: bool = False
    notes: Optional[str] = None
    acquired_date: Optional[date] = None
    purchase_price: Optional[float] = None

    # Alter (future scope)
    # alter_id: Optional[int] = Field(default=None, foreign_key="alter.id")