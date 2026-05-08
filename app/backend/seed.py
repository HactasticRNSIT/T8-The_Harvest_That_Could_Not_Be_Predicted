"\"\"\"Seed demo data: users, villages, alerts.\"\"\"
from datetime import datetime, timezone, timedelta
import uuid
import random

from auth import hash_password


DEMO_USERS = [
    {\"email\": \"farmer@agrisense.ai\", \"password\": \"Farmer@123\", \"name\": \"Ravi Kumar\", \"role\": \"farmer\"},
    {\"email\": \"officer@agrisense.ai\", \"password\": \"Officer@123\", \"name\": \"Priya Sharma\", \"role\": \"officer\"},
    {\"email\": \"analyst@agrisense.ai\", \"password\": \"Analyst@123\", \"name\": \"Arjun Mehta\", \"role\": \"analyst\"},
    {\"email\": \"admin@agrisense.ai\", \"password\": \"Admin@123\", \"name\": \"Admin\", \"role\": \"admin\"},
]


VILLAGE_SEED = [
    # name, district, state, lat, lng, crop
    (\"Khairapur\", \"Pune\", \"Maharashtra\", 18.6298, 73.7997, \"wheat\"),
    (\"Manjari\", \"Pune\", \"Maharashtra\", 18.5102, 73.9542, \"rice\"),
    (\"Talegaon\", \"Pune\", \"Maharashtra\", 18.7350, 73.6755, \"maize\"),
    (\"Wai\", \"Satara\", \"Maharashtra\", 17.9558, 73.8918, \"wheat\"),
    (\"Karad\", \"Satara\", \"Maharashtra\", 17.2858, 74.1846, \"sugarcane\"),
    (\"Sangli\", \"Sangli\", \"Maharashtra\", 16.8524, 74.5815, \"soybean\"),
    (\"Solapur\", \"Solapur\", \"Maharashtra\", 17.6599, 75.9064, \"millet\"),
    (\"Pandharpur\", \"Solapur\", \"Maharashtra\", 17.6792, 75.3242, \"cotton\"),
    (\"Akkalkot\", \"Solapur\", \"Maharashtra\", 17.5267, 76.2017, \"wheat\"),
    (\"Nashik\", \"Nashik\", \"Maharashtra\", 19.9975, 73.7898, \"maize\"),
    (\"Igatpuri\", \"Nashik\", \"Maharashtra\", 19.6960, 73.5605, \"rice\"),
    (\"Aurangabad\", \"Aurangabad\", \"Maharashtra\", 19.8762, 75.3433, \"cotton\"),
    (\"Jalna\", \"Jalna\", \"Maharashtra\", 19.8413, 75.8864, \"soybean\"),
    (\"Beed\", \"Beed\", \"Maharashtra\", 18.9891, 75.7601, \"millet\"),
    (\"Latur\", \"Latur\", \"Maharashtra\", 18.4088, 76.5604, \"wheat\"),
]


def _risk_from(yield_val: float, base: float) -> str:
    if yield_val >= base * 0.95:
        return \"low\"
    if yield_val >= base * 0.7:
        return \"moderate\"
    return \"high\"


async def seed_database(db):
    # Users
    existing = await db.users.count_documents({})
    if existing == 0:
        users_docs = []
        for u in DEMO_USERS:
            users_docs.append({
                \"id\": str(uuid.uuid4()),
                \"email\": u[\"email\"],
                \"name\": u[\"name\"],
                \"role\": u[\"role\"],
                \"password_hash\": hash_password(u[\"password\"]),
                \"created_at\": datetime.now(timezone.utc).isoformat(),
            })
        await db.users.insert_many(users_docs)

    # Villages
    if await db.villages.count_documents({}) == 0:
        from ml import predict, CROP_BASELINES
        villages = []
        random.seed(42)
        for name, district, state, lat, lng, crop in VILLAGE_SEED:
            features = {
                \"rainfall\": random.uniform(300, 1300),
                \"temperature\": random.uniform(18, 36),
                \"soil_n\": random.uniform(80, 350),
                \"soil_p\": random.uniform(15, 110),
                \"soil_k\": random.uniform(80, 320),
                \"water_index\": random.uniform(35, 95),
                \"seed_quality\": random.uniform(45, 95),
                \"pest_intensity\": random.uniform(5, 70),
            }
            yield_val, _, _, conf, _, risk = predict(features, crop)
            villages.append({
                \"id\": str(uuid.uuid4()),
                \"name\": name,
                \"district\": district,
                \"state\": state,
                \"lat\": lat,
                \"lng\": lng,
                \"crop\": crop,
                \"avg_rainfall\": round(features[\"rainfall\"], 1),
                \"avg_temp\": round(features[\"temperature\"], 1),
                \"soil_n\": round(features[\"soil_n\"], 1),
                \"soil_p\": round(features[\"soil_p\"], 1),
                \"soil_k\": round(features[\"soil_k\"], 1),
                \"water_index\": round(features[\"water_index\"], 1),
                \"seed_quality\": round(features[\"seed_quality\"], 1),
                \"pest_intensity\": round(features[\"pest_intensity\"], 1),
                \"historical_yield\": round(yield_val * random.uniform(0.85, 1.05), 2),
                \"risk\": risk,
                \"confidence\": conf,
            })
        await db.villages.insert_many(villages)

    # Alerts
    if await db.alerts.count_documents({}) == 0:
        villages = await db.villages.find({}, {\"_id\": 0}).to_list(50)
        alerts = []
        templates = [
            (\"Drought watch\", \"Soil moisture has fallen below 30% for 6 consecutive days.\", \"warning\", \"drought\"),
            (\"Pest outbreak\", \"Locust swarm detected within 80km radius. Increase scouting.\", \"critical\", \"pest\"),
            (\"Heavy rainfall warning\", \"120mm precipitation forecast in next 48h, prepare drainage.\", \"warning\", \"flood\"),
            (\"Low confidence prediction\", \"Model confidence dropped below 60%; supplement with field survey.\", \"info\", \"low_confidence\"),
            (\"Water shortage\", \"Reservoir storage at 24%. Prioritize critical irrigation phases.\", \"critical\", \"water_shortage\"),
            (\"Frost alert\", \"Night temperatures expected below 4°C — protect young crops.\", \"warning\", \"frost\"),
        ]
        random.seed(7)
        for i in range(8):
            v = random.choice(villages)
            t = random.choice(templates)
            alerts.append({
                \"id\": str(uuid.uuid4()),
                \"title\": t[0],
                \"message\": t[1],
                \"severity\": t[2],
                \"category\": t[3],
                \"village_id\": v[\"id\"],
                \"village_name\": v[\"name\"],
                \"created_at\": (datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 96))).isoformat(),
            })
        await db.alerts.insert_many(alerts)
"