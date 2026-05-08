"\"\"\"AgriSense AI – FastAPI backend.\"\"\"
import os
import uuid
import random
import logging
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import FastAPI, APIRouter, Depends, HTTPException
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

from models import (
    UserCreate, UserLogin, UserOut, TokenResponse,
    Village, PredictionInput, PredictionOutput, FeatureImpact,
    Alert, ChatRequest, ChatResponse,
)
from auth import (
    hash_password, verify_password, create_token,
    get_current_user_payload, require_roles,
)
from ml import predict, build_explanation, build_recommendations, CROP_BASELINES
from seed import seed_database


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / \".env\")

logging.basicConfig(level=logging.INFO, format=\"%(asctime)s %(levelname)s %(message)s\")
logger = logging.getLogger(\"agrisense\")

mongo_url = os.environ[\"MONGO_URL\"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ[\"DB_NAME\"]]

app = FastAPI(title=\"AgriSense AI\")
api = APIRouter(prefix=\"/api\")


# ──────────────────────────── Health ────────────────────────────
@api.get(\"/\")
async def root():
    return {\"service\": \"AgriSense AI\", \"status\": \"online\", \"time\": datetime.now(timezone.utc).isoformat()}


# ──────────────────────────── Auth ──────────────────────────────
@api.post(\"/auth/register\", response_model=TokenResponse)
async def register(payload: UserCreate):
    existing = await db.users.find_one({\"email\": payload.email}, {\"_id\": 0})
    if existing:
        raise HTTPException(status_code=400, detail=\"Email already registered\")
    user = {
        \"id\": str(uuid.uuid4()),
        \"email\": payload.email,
        \"name\": payload.name,
        \"role\": payload.role,
        \"password_hash\": hash_password(payload.password),
        \"created_at\": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)
    token = create_token(user[\"id\"], user[\"role\"])
    return TokenResponse(
        access_token=token,
        user=UserOut(id=user[\"id\"], email=user[\"email\"], name=user[\"name\"], role=user[\"role\"], created_at=user[\"created_at\"]),
    )


@api.post(\"/auth/login\", response_model=TokenResponse)
async def login(payload: UserLogin):
    user = await db.users.find_one({\"email\": payload.email}, {\"_id\": 0})
    if not user or not verify_password(payload.password, user[\"password_hash\"]):
        raise HTTPException(status_code=401, detail=\"Invalid credentials\")
    token = create_token(user[\"id\"], user[\"role\"])
    return TokenResponse(
        access_token=token,
        user=UserOut(**{k: user[k] for k in (\"id\", \"email\", \"name\", \"role\", \"created_at\")}),
    )


@api.get(\"/auth/me\", response_model=UserOut)
async def me(payload: dict = Depends(get_current_user_payload)):
    user = await db.users.find_one({\"id\": payload[\"sub\"]}, {\"_id\": 0, \"password_hash\": 0})
    if not user:
        raise HTTPException(status_code=404, detail=\"User not found\")
    return UserOut(**user)


# ──────────────────────────── Villages ──────────────────────────
@api.get(\"/villages\", response_model=List[Village])
async def list_villages():
    villages = await db.villages.find({}, {\"_id\": 0}).to_list(200)
    return [Village(**v) for v in villages]


@api.get(\"/villages/{village_id}\", response_model=Village)
async def get_village(village_id: str):
    v = await db.villages.find_one({\"id\": village_id}, {\"_id\": 0})
    if not v:
        raise HTTPException(status_code=404, detail=\"Village not found\")
    return Village(**v)


# ──────────────────────────── Prediction ────────────────────────
@api.post(\"/predict\", response_model=PredictionOutput)
async def make_prediction(payload: PredictionInput, user: dict = Depends(get_current_user_payload)):
    features = payload.model_dump()
    yield_val, lower, upper, confidence, feats, risk = predict(features, payload.crop)
    explanation = build_explanation(yield_val, risk, feats, payload.crop)
    recs = build_recommendations(features, feats)
    out = PredictionOutput(
        id=str(uuid.uuid4()),
        yield_tons_per_ha=yield_val,
        lower_bound=lower,
        upper_bound=upper,
        confidence=confidence,
        risk=risk,
        explanation=explanation,
        features=[FeatureImpact(**f) for f in feats],
        recommendations=recs,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    doc = out.model_dump()
    doc[\"user_id\"] = user[\"sub\"]
    doc[\"village_id\"] = payload.village_id
    await db.predictions.insert_one(doc)
    return out


# ──────────────────────────── Alerts ────────────────────────────
@api.get(\"/alerts\", response_model=List[Alert])
async def list_alerts():
    alerts = await db.alerts.find({}, {\"_id\": 0}).sort(\"created_at\", -1).to_list(100)
    return [Alert(**a) for a in alerts]


# ──────────────────────────── Weather / NDVI (synthetic) ────────
@api.get(\"/weather/{village_id}\")
async def weather(village_id: str):
    v = await db.villages.find_one({\"id\": village_id}, {\"_id\": 0})
    if not v:
        raise HTTPException(status_code=404, detail=\"Village not found\")
    rng = random.Random(hash(village_id) % (2**32))
    days = []
    base_temp = v[\"avg_temp\"]
    base_rain = v[\"avg_rainfall\"] / 30.0
    base_ndvi = 0.55 + (1.0 if v[\"risk\"] == \"low\" else 0.7 if v[\"risk\"] == \"moderate\" else 0.4) * 0.1
    for i in range(14):
        d = (datetime.now(timezone.utc) - timedelta(days=13 - i)).date().isoformat()
        days.append({
            \"date\": d,
            \"temp\": round(base_temp + rng.uniform(-3.5, 3.5), 1),
            \"rain_mm\": round(max(0, base_rain + rng.uniform(-base_rain * 0.6, base_rain * 1.4)), 1),
            \"ndvi\": round(max(0.1, min(0.95, base_ndvi + rng.uniform(-0.08, 0.08))), 3),
            \"humidity\": round(50 + rng.uniform(-15, 25), 1),
        })
    return {\"village\": v, \"series\": days}


# ──────────────────────────── Analytics ─────────────────────────
@api.get(\"/analytics/overview\")
async def overview():
    villages = await db.villages.find({}, {\"_id\": 0}).to_list(200)
    if not villages:
        return {
            \"predicted_yield\": 0, \"rainfall\": 0, \"soil_health\": 0,
            \"risk_level\": \"low\", \"confidence\": 0,
            \"risk_distribution\": {\"low\": 0, \"moderate\": 0, \"high\": 0},
            \"village_count\": 0,
        }
    avg_yield = sum(v[\"historical_yield\"] for v in villages) / len(villages)
    avg_rain = sum(v[\"avg_rainfall\"] for v in villages) / len(villages)
    soil_health = sum((v[\"soil_n\"] / 350 + v[\"soil_p\"] / 110 + v[\"soil_k\"] / 320) / 3 * 100 for v in villages) / len(villages)
    confidence = sum(v[\"confidence\"] for v in villages) / len(villages)
    dist = {\"low\": 0, \"moderate\": 0, \"high\": 0}
    for v in villages:
        dist[v[\"risk\"]] += 1
    overall_risk = max(dist, key=dist.get)
    return {
        \"predicted_yield\": round(avg_yield, 2),
        \"rainfall\": round(avg_rain, 1),
        \"soil_health\": round(soil_health, 1),
        \"risk_level\": overall_risk,
        \"confidence\": round(confidence, 1),
        \"risk_distribution\": dist,
        \"village_count\": len(villages),
    }


@api.get(\"/analytics/districts\")
async def districts():
    villages = await db.villages.find({}, {\"_id\": 0}).to_list(200)
    bucket: dict = {}
    for v in villages:
        d = bucket.setdefault(v[\"district\"], {\"district\": v[\"district\"], \"yield\": 0, \"confidence\": 0, \"rainfall\": 0, \"high_risk\": 0, \"count\": 0})
        d[\"yield\"] += v[\"historical_yield\"]
        d[\"confidence\"] += v[\"confidence\"]
        d[\"rainfall\"] += v[\"avg_rainfall\"]
        d[\"high_risk\"] += 1 if v[\"risk\"] == \"high\" else 0
        d[\"count\"] += 1
    rows = []
    for d in bucket.values():
        c = d[\"count\"]
        rows.append({
            \"district\": d[\"district\"],
            \"avg_yield\": round(d[\"yield\"] / c, 2),
            \"avg_confidence\": round(d[\"confidence\"] / c, 1),
            \"avg_rainfall\": round(d[\"rainfall\"] / c, 1),
            \"high_risk_villages\": d[\"high_risk\"],
            \"village_count\": c,
        })
    rows.sort(key=lambda r: r[\"avg_yield\"], reverse=True)
    return rows


@api.get(\"/analytics/yield-trend\")
async def yield_trend():
    # Synthetic 12-month trend
    months = [\"Mar\", \"Apr\", \"May\", \"Jun\", \"Jul\", \"Aug\", \"Sep\", \"Oct\", \"Nov\", \"Dec\", \"Jan\", \"Feb\"]
    rng = random.Random(99)
    base = 3.2
    series = []
    for i, m in enumerate(months):
        series.append({
            \"month\": m,
            \"predicted\": round(base + rng.uniform(-0.5, 0.7) + i * 0.04, 2),
            \"actual\": round(base + rng.uniform(-0.6, 0.6) + i * 0.035, 2),
        })
    return series


# ──────────────────────────── Admin ─────────────────────────────
@api.get(\"/admin/users\")
async def admin_users(_: dict = Depends(require_roles(\"admin\"))):
    users = await db.users.find({}, {\"_id\": 0, \"password_hash\": 0}).to_list(500)
    return users


@api.get(\"/admin/predictions\")
async def admin_predictions(_: dict = Depends(require_roles(\"admin\", \"analyst\"))):
    rows = await db.predictions.find({}, {\"_id\": 0}).sort(\"created_at\", -1).to_list(100)
    return rows


# ──────────────────────────── AI Chat ───────────────────────────
@api.post(\"/chat\", response_model=ChatResponse)
async def chat(req: ChatRequest, user: dict = Depends(get_current_user_payload)):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    api_key = os.environ.get(\"EMERGENT_LLM_KEY\")
    if not api_key:
        raise HTTPException(status_code=500, detail=\"LLM key not configured\")
    session_id = req.session_id or str(uuid.uuid4())
    system = (
        \"You are AgriSense, an expert AI assistant for agriculture. \"
        \"Provide concise, practical guidance on crop yield, irrigation, soil health, \"
        \"pest management, weather risk and policy planning. Use simple language suited \"
        \"for farmers and field officers. Keep replies under 160 words.\"
    )
    chat_obj = LlmChat(api_key=api_key, session_id=session_id, system_message=system).with_model(
        \"anthropic\", \"claude-sonnet-4-5-20250929\"
    )
    try:
        reply = await chat_obj.send_message(UserMessage(text=req.message))
    except Exception as e:
        logger.exception(\"LLM chat error\")
        raise HTTPException(status_code=502, detail=f\"LLM error: {e}\")

    created_at = datetime.now(timezone.utc).isoformat()
    await db.chat_messages.insert_many([
        {\"id\": str(uuid.uuid4()), \"session_id\": session_id, \"role\": \"user\", \"text\": req.message, \"created_at\": created_at, \"user_id\": user[\"sub\"]},
        {\"id\": str(uuid.uuid4()), \"session_id\": session_id, \"role\": \"assistant\", \"text\": reply, \"created_at\": created_at, \"user_id\": user[\"sub\"]},
    ])
    return ChatResponse(session_id=session_id, reply=reply, created_at=created_at)


# ──────────────────────────── Lifecycle ─────────────────────────
app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get(\"CORS_ORIGINS\", \"*\").split(\",\"),
    allow_methods=[\"*\"],
    allow_headers=[\"*\"],
)


@app.on_event(\"startup\")
async def on_startup():
    try:
        await seed_database(db)
        logger.info(\"Seed complete.\")
    except Exception:
        logger.exception(\"Seed failed\")


@app.on_event(\"shutdown\")
async def on_shutdown():
    client.close()
"


Action: {"type": "mcp_tool", "tool_name": "mcp_view_bulk", "tool_arguments": {"paths": ["/app/design_guidelines.json", "/app/backend/server.py", "/app/backend/.env", "/app/backend/requirements.txt", "/app/frontend/.env", "/app/frontend/package.json", "/app/frontend/src/App.js", "/app/frontend/src/App.css", "/app/frontend/src/index.css", "/app/frontend/src/index.js", "/app/frontend/tailwind.config.js"]}}
Observation: ===FILE: /app/design_guidelines.json
/app/design_guidelines.json:
1|{
2|  "theme": "dark",
3|  "archetype": "7 (Electric & Neon) - Custom Godly Agriculture",
4|  "typography": {
5|    "fonts": {
6|      "heading": "Unbounded",
7|      "body": "IBM Plex Sans",
8|      "mono": "JetBrains Mono"
9|    },
10|    "hierarchy": {
11|      "h1": "text-4xl sm:text-5xl lg:text-6xl tracking-tighter leading-tight font-black",
12|      "h2": "text-2xl sm:text-3xl lg:text-4xl tracking-tight leading-snug font-bold",
13|      "h3": "text-xl sm:text-2xl tracking-tight font-semibold",
14|      "h4": "text-lg sm:text-xl tracking-tight font-medium",
15|      "body": "text-base leading-relaxed font-normal",
16|      "label": "text-xs tracking-[0.2em] uppercase font-bold text-gray-400"
17|    }
18|  },
19|  "colors": {
20|    "background": {
21|      "primary": "#0A0A0F",
22|      "secondary": "#14141E",
23|      "tertiary": "#1C1C29"
24|    },
25|    "text": {
26|      "primary": "#FFFFFF",
27|      "secondary": "#A1A1AA",
28|      "accent": "#00FF88"
29|    },
30|    "brand": {
31|      "primary": "#00FF88",
32|      "secondary": "#00E5FF",
33|      "accent": "#F4D03F",
34|      "muted": "rgba(0, 255, 136, 0.2)"
35|    },
36|    "status": {
37|      "success": "#00FF88",
38|      "warning": "#F4D03F",
39|      "error": "#FF3B30",
40|      "info": "#00E5FF"
41|    },
42|    "borders": {
43|      "subtle": "rgba(255, 255, 255, 0.1)",
44|      "focus": "#00FF88",
45|      "neon": "rgba(0, 255, 136, 0.5)"
46|    }
47|  },
48|  "surfaces": {
49|    "glass_card": "bg-white/5 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] rounded-xl",
50|    "glass_header": "bg-[#0A0A0F]/70 backdrop-blur-xl border-b border-white/10",
51|    "solid_card": "bg-[#14141E] border border-white/5 rounded-xl",
52|    "neon_glow": "shadow-[0_0_15px_rgba(0,255,136,0.3)] border border-[#00FF88]/50"
53|  },
54|  "layout": {
55|    "spacing_scale": {
56|      "container_padding": "p-6 md:p-12 lg:p-16",
57|      "section_gap": "gap-16 md:gap-24 lg:gap-32",
58|      "card_padding": "p-6 sm:p-8"
59|    },
60|    "grids": {
61|      "landing": "grid grid-cols-1 md:grid-cols-8 lg:grid-cols-12 gap-8 md:gap-12",
62|      "dashboard": "grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6"
63|    }
64|  },
65|  "components": {
66|    "buttons": {
67|      "primary": "bg-[#00FF88] text-[#0A0A0F] font-bold px-6 py-3 rounded-lg hover:bg-[#00E5FF] transition-all duration-300 shadow-[0_0_20px_rgba(0,255,136,0.4)] hover:shadow-[0_0_25px_rgba(0,229,255,0.6)]",
68|      "secondary": "bg-transparent text-white border border-white/20 px-6 py-3 rounded-lg hover:bg-white/10 hover:border-white/40 transition-all duration-300",
69|      "ghost": "text-gray-300 hover:text-white hover:bg-white/5 px-4 py-2 rounded-lg transition-colors"
70|    },
71|    "inputs": {
72|      "default": "bg-white/5 border border-white/10 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#00FF88] focus:border-transparent transition-all placeholder:text-gray-500",
73|      "label": "block text-sm font-medium text-gray-300 mb-1"
74|    },
75|    "badges": {
76|      "glow": "px-3 py-1 rounded-full text-xs font-bold bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/30 shadow-[0_0_10px_rgba(0,255,136,0.2)]"
77|    }
78|  },
79|  "animations": {
80|    "transition": "transition-all duration-300 ease-out",
81|    "hover_card": "hover:-translate-y-1 hover:border-white/30 hover:shadow-xl",
82|    "framer_motion_defaults": {
83|      "initial": { "opacity": 0, "y": 20 },
84|      "animate": { "opacity": 1, "y": 0 },
85|      "transition": { "duration": 0.5, "ease": "easeOut" }
86|    }
87|  },
88|  "media": {
89|    "images": [
90|      {
91|        "category": "hero_background",
92|        "url": "https://images.unsplash.com/photo-1726383222152-134ad0536b76?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODF8MHwxfHNlYXJjaHwyfHxuZW9uJTIwZ3JlZW4lMjBhYnN0cmFjdHxlbnwwfHx8fDE3NzgyMTM3Nzd8MA&ixlib=rb-4.1.0&q=85",
93|        "description": "Neon green abstract texture for ambient glowing background"
94|      },
95|      {
96|        "category": "feature_smart_farming",
97|        "url": "https://images.unsplash.com/photo-1518994603110-1912b3272afd?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAxODF8MHwxfHNlYXJjaHwyfHxzbWFydCUyMGZhcm1pbmd8ZW58MHx8fHwxNzc4MjEzNzc3fDA&ixlib=rb-4.1.0&q=85",
98|        "description": "Close up photography of green plants in a futuristic greenhouse"
99|      },
100|      {
101|        "category": "satellite_map_concept",
102|        "url": "https://images.unsplash.com/photo-1640796433065-f423a9d9a5fd?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzl8MHwxfHNlYXJjaHwyfHxzYXRlbGxpdGUlMjB2aWV3JTIwZWFydGh8ZW58MHx8fHwxNzc4MjEzNzU1fDA&ixlib=rb-4.1.0&q=85",
103|        "description": "Space/satellite view above a body of water for earth observation concept"
104|      },
105|      {
106|        "category": "tech_texture_dark",
107|        "url": "https://images.unsplash.com/photo-1754738797051-4e0c6983473a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzN8MHwxfHNlYXJjaHwxfHxkYXJrJTIwdGVjaG5vbG9neSUyMGFic3RyYWN0fGVufDB8fHx8MTc3ODIxMzc3N3ww&ixlib=rb-4.1.0&q=85",
108|        "description": "Dark technology abstract for AI engine cards and dark dashboard overlays"
109|      }
110|    ]
111|  },
112|  "instructions_to_main_agent": [
113|    "Strictly follow the color palette: Deep Charcoal (#0A0A0F) backgrounds with Cyber Green (#00FF88) and Cyan (#00E5FF) accents.",
114|    "Do NOT use pure white backgrounds or light mode anywhere. This is a strictly dark, futuristic UI.",
115|    "Use Glassmorphism (bg-white/5 backdrop-blur-2xl) on dashboard cards and floating panels to mimic a 'Tesla dashboard' operating system.",
116|    "Use Framer Motion for entrance animations (staggered lists) and animated data counters on the stat cards.",
117|    "For the Interactive Map, use Leaflet with a dark matter tile layer (e.g., CartoDB Dark Matter) overlaid with neon green/red risk zones.",
118|    "All interactive elements must have a explicit focus state (focus:ring-2 focus:ring-[#00FF88]) and a data-testid attribute for testing.",
119|    "Integrate Recharts with transparent backgrounds, using #00FF88 and #00E5FF for data lines/bars to match the neon aesthetic.",
120|    "Install and use @phosphor-icons/react for high-tech, precise iconography.",
121|    "Ensure 'Farmer Mode' remains ultra-simplified: larger fonts (min text-lg), high-contrast buttons, and fewer data points on screen compared to 'Analytics Mode'."
122|  ]
123|}

===END

===FILE: /app/backend/server.py
/app/backend/server.py:
1|from fastapi import FastAPI, APIRouter
2|from dotenv import load_dotenv
3|from starlette.middleware.cors import CORSMiddleware
4|from motor.motor_asyncio import AsyncIOMotorClient
5|import os
6|import logging
7|from pathlib import Path
8|from pydantic import BaseModel, Field, ConfigDict
9|from typing import List
10|import uuid
11|from datetime import datetime, timezone
12|
13|
14|ROOT_DIR = Path(__file__).parent
15|load_dotenv(ROOT_DIR / '.env')
16|
17|# MongoDB connection
18|mongo_url = os.environ['MONGO_URL']
19|client = AsyncIOMotorClient(mongo_url)
20|db = client[os.environ['DB_NAME']]
21|
22|# Create the main app without a prefix
23|app = FastAPI()
24|
25|# Create a router with the /api prefix
26|api_router = APIRouter(prefix="/api")
27|
28|
29|# Define Models
30|class StatusCheck(BaseModel):
31|    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
32|    
33|    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
34|    client_name: str
35|    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
36|
37|class StatusCheckCreate(BaseModel):
38|    client_name: str
39|
40|# Add your routes to the router instead of directly to app
41|@api_router.get("/")
42|async def root():
43|    return {"message": "Hello World"}
44|
45|@api_router.post("/status", response_model=StatusCheck)
46|async def create_status_check(input: StatusCheckCreate):
47|    status_dict = input.model_dump()
48|    status_obj = StatusCheck(**status_dict)
49|    
50|    # Convert to dict and serialize datetime to ISO string for MongoDB
51|    doc = status_obj.model_dump()
52|    doc['timestamp'] = doc['timestamp'].isoformat()
53|    
54|    _ = await db.status_checks.insert_one(doc)
55|    return status_obj
56|
57|@api_router.get("/status", response_model=List[StatusCheck])
58|async def get_status_checks():
59|    # Exclude MongoDB's _id field from the query results
60|    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
61|    
62|    # Convert ISO string timestamps back to datetime objects
63|    for check in status_checks:
64|        if isinstance(check['timestamp'], str):
65|            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
66|    
67|    return status_checks
68|
69|# Include the router in the main app
70|app.include_router(api_router)
71|
72|app.add_middleware(
73|    CORSMiddleware,
74|    allow_credentials=True,
75|    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
76|    allow_methods=["*"],
77|    allow_headers=["*"],
78|)
79|
80|# Configure logging
81|logging.basicConfig(
82|    level=logging.INFO,
83|    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
84|)
85|logger = logging.getLogger(__name__)
86|
87|@app.on_event("shutdown")
88|async def shutdown_db_client():
89|    client.close()

===END

===FILE: /app/backend/.env
/app/backend/.env:
1|MONGO_URL="mongodb://localhost:27017"
2|DB_NAME="test_database"
3|CORS_ORIGINS="*"

===END

===FILE: /app/backend/requirements.txt
/app/backend/requirements.txt:
1|fastapi==0.110.1
2|uvicorn==0.25.0
3|boto3>=1.34.129
4|requests-oauthlib>=2.0.0
5|cryptography>=42.0.8
6|python-dotenv>=1.0.1
7|pymongo==4.5.0
8|pydantic>=2.6.4
9|email-validator>=2.2.0
10|pyjwt>=2.10.1
11|bcrypt==4.1.3
12|passlib>=1.7.4
13|tzdata>=2024.2
14|motor==3.3.1
15|pytest>=8.0.0
16|black>=24.1.1
17|isort>=5.13.2
18|flake8>=7.0.0
19|mypy>=1.8.0
20|python-jose>=3.3.0
21|requests>=2.31.0
22|pandas>=2.2.0
23|numpy>=1.26.0
24|python-multipart>=0.0.9
25|jq>=1.6.0
26|typer>=0.9.0
27|emergentintegrations==0.1.0
28|

===END

===FILE: /app/frontend/.env
/app/frontend/.env:
1|REACT_APP_BACKEND_URL=https://village-harvest-36.preview.emergentagent.com
2|WDS_SOCKET_PORT=443
3|ENABLE_HEALTH_CHECK=false

===END

===FILE: /app/frontend/package.json
/app/frontend/package.json:
1|{
2|  "name": "frontend",
3|  "version": "0.1.0",
4|  "private": true,
5|  "dependencies": {
6|    "@hookform/resolvers": "^5.0.1",
7|    "@radix-ui/react-accordion": "^1.2.8",
8|    "@radix-ui/react-alert-dialog": "^1.1.11",
9|    "@radix-ui/react-aspect-ratio": "^1.1.4",
10|    "@radix-ui/react-avatar": "^1.1.7",
11|    "@radix-ui/react-checkbox": "^1.2.3",
12|    "@radix-ui/react-collapsible": "^1.1.8",
13|    "@radix-ui/react-context-menu": "^2.2.12",
14|    "@radix-ui/react-dialog": "^1.1.11",
15|    "@radix-ui/react-dropdown-menu": "^2.1.12",
16|    "@radix-ui/react-hover-card": "^1.1.11",
17|    "@radix-ui/react-label": "^2.1.4",
18|    "@radix-ui/react-menubar": "^1.1.12",
19|    "@radix-ui/react-navigation-menu": "^1.2.10",
20|    "@radix-ui/react-popover": "^1.1.11",
21|    "@radix-ui/react-progress": "^1.1.4",
22|    "@radix-ui/react-radio-group": "^1.3.4",
23|    "@radix-ui/react-scroll-area": "^1.2.6",
24|    "@radix-ui/react-select": "^2.2.2",
25|    "@radix-ui/react-separator": "^1.1.4",
26|    "@radix-ui/react-slider": "^1.3.2",
27|    "@radix-ui/react-slot": "^1.2.0",
28|    "@radix-ui/react-switch": "^1.2.2",
29|    "@radix-ui/react-tabs": "^1.1.9",
30|    "@radix-ui/react-toast": "^1.2.11",
31|    "@radix-ui/react-toggle": "^1.1.6",
32|    "@radix-ui/react-toggle-group": "^1.1.7",
33|    "@radix-ui/react-tooltip": "^1.2.4",
34|    "axios": "^1.8.4",
35|    "class-variance-authority": "^0.7.1",
36|    "clsx": "^2.1.1",
37|    "cmdk": "^1.1.1",
38|    "cra-template": "1.2.0",
39|    "date-fns": "^4.1.0",
40|    "embla-carousel-react": "^8.6.0",
41|    "input-otp": "^1.4.2",
42|    "lucide-react": "^0.507.0",
43|    "next-themes": "^0.4.6",
44|    "react": "^19.0.0",
45|    "react-day-picker": "8.10.1",
46|    "react-dom": "^19.0.0",
47|    "react-hook-form": "^7.56.2",
48|    "react-resizable-panels": "^3.0.1",
49|    "react-router-dom": "^7.5.1",
50|    "react-scripts": "5.0.1",
51|    "recharts": "^3.6.0",
52|    "sonner": "^2.0.3",
53|    "tailwind-merge": "^3.2.0",
54|    "tailwindcss-animate": "^1.0.7",
55|    "vaul": "^1.1.2",
56|    "zod": "^3.24.4"
57|  },
58|  "scripts": {
59|    "start": "craco start",
60|    "build": "craco build",
61|    "test": "craco test"
62|  },
63|  "browserslist": {
64|    "production": [
65|      ">0.2%",
66|      "not dead",
67|      "not op_mini all"
68|    ],
69|    "development": [
70|      "last 1 chrome version",
71|      "last 1 firefox version",
72|      "last 1 safari version"
73|    ]
74|  },
75|  "devDependencies": {
76|    "@babel/plugin-proposal-private-property-in-object": "^7.21.11",
77|    "@craco/craco": "^7.1.0",
78|    "@emergentbase/visual-edits": "https://assets.emergent.sh/npm/emergentbase-visual-edits-1.0.8.tgz",
79|    "@eslint/js": "9.23.0",
80|    "autoprefixer": "^10.4.20",
81|    "eslint": "9.23.0",
82|    "eslint-plugin-import": "2.31.0",
83|    "eslint-plugin-jsx-a11y": "6.10.2",
84|    "eslint-plugin-react": "7.37.4",
85|    "eslint-plugin-react-hooks": "5.2.0",
86|    "globals": "15.15.0",
87|    "postcss": "^8.4.49",
88|    "tailwindcss": "^3.4.17"
89|  },
90|  "packageManager": "yarn@1.22.22+sha512.a6b2f7906b721bba3d67d4aff083df04dad64c399707841b7acf00f6b133b7ac24255f2652fa22ae3534329dc6180534e98d17432037ff6fd140556e2bb3137e"
91|}
92|

===END

===FILE: /app/frontend/src/App.js
/app/frontend/src/App.js:
1|import { useEffect } from "react";
2|import "@/App.css";
3|import { BrowserRouter, Routes, Route } from "react-router-dom";
4|import axios from "axios";
5|
6|const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
7|const API = `${BACKEND_URL}/api`;
8|
9|const Home = () => {
10|  const helloWorldApi = async () => {
11|    try {
12|      const response = await axios.get(`${API}/`);
13|      console.log(response.data.message);
14|    } catch (e) {
15|      console.error(e, `errored out requesting / api`);
16|    }
17|  };
18|
19|  useEffect(() => {
20|    helloWorldApi();
21|  }, []);
22|
23|  return (
24|    <div>
25|      <header className="App-header">
26|        <a
27|          className="App-link"
28|          href="https://emergent.sh"
29|          target="_blank"
30|          rel="noopener noreferrer"
31|        >
32|          <img src="https://avatars.githubusercontent.com/in/1201222?s=120&u=2686cf91179bbafbc7a71bfbc43004cf9ae1acea&v=4" />
33|        </a>
34|        <p className="mt-5">Building something incredible ~!</p>
35|      </header>
36|    </div>
37|  );
38|};
39|
40|function App() {
41|  return (
42|    <div className="App">
43|      <BrowserRouter>
44|        <Routes>
45|          <Route path="/" element={<Home />}>
46|            <Route index element={<Home />} />
47|          </Route>
48|        </Routes>
49|      </BrowserRouter>
50|    </div>
51|  );
52|}
53|
54|export default App;
55|

===END

===FILE: /app/frontend/src/App.css
/app/frontend/src/App.css:
1|.App-logo {
2|    height: 40vmin;
3|    pointer-events: none;
4|}
5|
6|@media (prefers-reduced-motion: no-preference) {
7|    .App-logo {
8|        animation: App-logo-spin infinite 20s linear;
9|    }
10|}
11|
12|.App-header {
13|    background-color: #0f0f10;
14|    min-height: 100vh;
15|    display: flex;
16|    flex-direction: column;
17|    align-items: center;
18|    justify-content: center;
19|    font-size: calc(10px + 2vmin);
20|    color: white;
21|}
22|
23|.App-link {
24|    color: #61dafb;
25|}
26|
27|@keyframes App-logo-spin {
28|    from {
29|        transform: rotate(0deg);
30|    }
31|    to {
32|        transform: rotate(360deg);
33|    }
34|}
35|

===END

===FILE: /app/frontend/src/index.css
/app/frontend/src/index.css:
1|@tailwind base;
2|@tailwind components;
3|@tailwind utilities;
4|
5|body {
6|    margin: 0;
7|    font-family:
8|        -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen",
9|        "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue",
10|        sans-serif;
11|    -webkit-font-smoothing: antialiased;
12|    -moz-osx-font-smoothing: grayscale;
13|}
14|
15|code {
16|    font-family:
17|        source-code-pro, Menlo, Monaco, Consolas, "Courier New", monospace;
18|}
19|
20|@layer base {
21|    :root {
22|        --background: 0 0% 100%;
23|        --foreground: 0 0% 3.9%;
24|        --card: 0 0% 100%;
25|        --card-foreground: 0 0% 3.9%;
26|        --popover: 0 0% 100%;
27|        --popover-foreground: 0 0% 3.9%;
28|        --primary: 0 0% 9%;
29|        --primary-foreground: 0 0% 98%;
30|        --secondary: 0 0% 96.1%;
31|        --secondary-foreground: 0 0% 9%;
32|        --muted: 0 0% 96.1%;
33|        --muted-foreground: 0 0% 45.1%;
34|        --accent: 0 0% 96.1%;
35|        --accent-foreground: 0 0% 9%;
36|        --destructive: 0 84.2% 60.2%;
37|        --destructive-foreground: 0 0% 98%;
38|        --border: 0 0% 89.8%;
39|        --input: 0 0% 89.8%;
40|        --ring: 0 0% 3.9%;
41|        --chart-1: 12 76% 61%;
42|        --chart-2: 173 58% 39%;
43|        --chart-3: 197 37% 24%;
44|        --chart-4: 43 74% 66%;
45|        --chart-5: 27 87% 67%;
46|        --radius: 0.5rem;
47|    }
48|    .dark {
49|        --background: 0 0% 3.9%;
50|        --foreground: 0 0% 98%;
51|        --card: 0 0% 3.9%;
52|        --card-foreground: 0 0% 98%;
53|        --popover: 0 0% 3.9%;
54|        --popover-foreground: 0 0% 98%;
55|        --primary: 0 0% 98%;
56|        --primary-foreground: 0 0% 9%;
57|        --secondary: 0 0% 14.9%;
58|        --secondary-foreground: 0 0% 98%;
59|        --muted: 0 0% 14.9%;
60|        --muted-foreground: 0 0% 63.9%;
61|        --accent: 0 0% 14.9%;
62|        --accent-foreground: 0 0% 98%;
63|        --destructive: 0 62.8% 30.6%;
64|        --destructive-foreground: 0 0% 98%;
65|        --border: 0 0% 14.9%;
66|        --input: 0 0% 14.9%;
67|        --ring: 0 0% 83.1%;
68|        --chart-1: 220 70% 50%;
69|        --chart-2: 160 60% 45%;
70|        --chart-3: 30 80% 55%;
71|        --chart-4: 280 65% 60%;
72|        --chart-5: 340 75% 55%;
73|    }
74|}
75|
76|@layer base {
77|    * {
78|        @apply border-border;
79|    }
80|    body {
81|        @apply bg-background text-foreground;
82|    }
83|}
84|
85|@layer base {
86|    [data-debug-wrapper="true"] {
87|        display: contents !important;
88|    }
89|
90|    [data-debug-wrapper="true"] > * {
91|        margin-left: inherit;
92|        margin-right: inherit;
93|        margin-top: inherit;
94|        margin-bottom: inherit;
95|        padding-left: inherit;
96|        padding-right: inherit;
97|        padding-top: inherit;
98|        padding-bottom: inherit;
99|        column-gap: inherit;
100|        row-gap: inherit;
101|        gap: inherit;
102|        border-left-width: inherit;
103|        border-right-width: inherit;
104|        border-top-width: inherit;
105|        border-bottom-width: inherit;
106|        border-left-style: inherit;
107|        border-right-style: inherit;
108|        border-top-style: inherit;
109|        border-bottom-style: inherit;
110|        border-left-color: inherit;
111|        border-right-color: inherit;
112|        border-top-color: inherit;
113|        border-bottom-color: inherit;
114|    }
115|}
116|

===END

===FILE: /app/frontend/src/index.js
/app/frontend/src/index.js:
1|import React from "react";
2|import ReactDOM from "react-dom/client";
3|import "@/index.css";
4|import App from "@/App";
5|
6|const root = ReactDOM.createRoot(document.getElementById("root"));
7|root.render(
8|  <React.StrictMode>
9|    <App />
10|  </React.StrictMode>,
11|);
12|

===END

===FILE: /app/frontend/tailwind.config.js
/app/frontend/tailwind.config.js:
1|/** @type {import('tailwindcss').Config} */
2|module.exports = {
3|    darkMode: ["class"],
4|    content: [
5|    "./src/**/*.{js,jsx,ts,tsx}",
6|    "./public/index.html"
7|  ],
8|  theme: {
9|        extend: {
10|                borderRadius: {
11|                        lg: 'var(--radius)',
12|                        md: 'calc(var(--radius) - 2px)',
13|                        sm: 'calc(var(--radius) - 4px)'
14|                },
15|                colors: {
16|                        background: 'hsl(var(--background))',
17|                        foreground: 'hsl(var(--foreground))',
18|                        card: {
19|                                DEFAULT: 'hsl(var(--card))',
20|                                foreground: 'hsl(var(--card-foreground))'
21|                        },
22|                        popover: {
23|                                DEFAULT: 'hsl(var(--popover))',
24|                                foreground: 'hsl(var(--popover-foreground))'
25|                        },
26|                        primary: {
27|                                DEFAULT: 'hsl(var(--primary))',
28|                                foreground: 'hsl(var(--primary-foreground))'
29|                        },
30|                        secondary: {
31|                                DEFAULT: 'hsl(var(--secondary))',
32|                                foreground: 'hsl(var(--secondary-foreground))'
33|                        },
34|                        muted: {
35|                                DEFAULT: 'hsl(var(--muted))',
36|                                foreground: 'hsl(var(--muted-foreground))'
37|                        },
38|                        accent: {
39|                                DEFAULT: 'hsl(var(--accent))',
40|                                foreground: 'hsl(var(--accent-foreground))'
41|                        },
42|                        destructive: {
43|                                DEFAULT: 'hsl(var(--destructive))',
44|                                foreground: 'hsl(var(--destructive-foreground))'
45|                        },
46|                        border: 'hsl(var(--border))',
47|                        input: 'hsl(var(--input))',
48|                        ring: 'hsl(var(--ring))',
49|                        chart: {
50|                                '1': 'hsl(var(--chart-1))',
51|                                '2': 'hsl(var(--chart-2))',
52|                                '3': 'hsl(var(--chart-3))',
53|                                '4': 'hsl(var(--chart-4))',
54|                                '5': 'hsl(var(--chart-5))'
55|                        }
56|                },
57|                keyframes: {
58|                        'accordion-down': {
59|                                from: {
60|                                        height: '0'
61|                                },
62|                                to: {
63|                                        height: 'var(--radix-accordion-content-height)'
64|                                }
65|                        },
66|                        'accordion-up': {
67|                                from: {
68|                                        height: 'var(--radix-accordion-content-height)'
69|                                },
70|                                to: {
71|                                        height: '0'
72|                                }
73|                        }
74|                },
75|                animation: {
76|                        'accordion-down': 'accordion-down 0.2s ease-out',
77|                        'accordion-up': 'accordion-up 0.2s ease-out'
78|                }
79|        }
80|  },
81|  plugins: [require("tailwindcss-animate")],
82|};

===END