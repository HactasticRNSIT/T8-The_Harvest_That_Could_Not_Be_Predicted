"\"\"\"Pydantic models for AgriSense AI.\"\"\"
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import List, Optional, Literal
from datetime import datetime, timezone
import uuid


def _id() -> str:
    return str(uuid.uuid4())


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


Role = Literal[\"farmer\", \"officer\", \"analyst\", \"admin\"]


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str
    role: Role = \"farmer\"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(extra=\"ignore\")
    id: str
    email: EmailStr
    name: str
    role: Role
    created_at: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = \"bearer\"
    user: UserOut


class Village(BaseModel):
    model_config = ConfigDict(extra=\"ignore\")
    id: str = Field(default_factory=_id)
    name: str
    district: str
    state: str
    lat: float
    lng: float
    crop: str
    avg_rainfall: float
    avg_temp: float
    soil_n: float
    soil_p: float
    soil_k: float
    water_index: float
    seed_quality: float
    pest_intensity: float
    historical_yield: float
    risk: Literal[\"low\", \"moderate\", \"high\"]
    confidence: float


class PredictionInput(BaseModel):
    rainfall: float = Field(ge=0, le=3000)
    temperature: float = Field(ge=-10, le=55)
    soil_n: float = Field(ge=0, le=400)
    soil_p: float = Field(ge=0, le=200)
    soil_k: float = Field(ge=0, le=400)
    water_index: float = Field(ge=0, le=100)
    seed_quality: float = Field(ge=0, le=100)
    pest_intensity: float = Field(ge=0, le=100)
    crop: str = \"wheat\"
    village_id: Optional[str] = None


class FeatureImpact(BaseModel):
    name: str
    value: float
    impact: float
    direction: Literal[\"positive\", \"negative\"]


class PredictionOutput(BaseModel):
    id: str
    yield_tons_per_ha: float
    lower_bound: float
    upper_bound: float
    confidence: float
    risk: Literal[\"low\", \"moderate\", \"high\"]
    explanation: str
    features: List[FeatureImpact]
    recommendations: List[str]
    created_at: str


class Alert(BaseModel):
    model_config = ConfigDict(extra=\"ignore\")
    id: str = Field(default_factory=_id)
    title: str
    message: str
    severity: Literal[\"info\", \"warning\", \"critical\"]
    category: Literal[\"drought\", \"pest\", \"flood\", \"low_confidence\", \"water_shortage\", \"frost\"]
    village_id: Optional[str] = None
    village_name: Optional[str] = None
    created_at: str = Field(default_factory=_now)


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    session_id: str
    reply: str
    created_at: str
"