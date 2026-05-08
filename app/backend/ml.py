"\"\"\"Lightweight yield prediction model with feature contributions and uncertainty.\"\"\"
from typing import List, Tuple
import math

# Linear coefficients (per crop) tuned for tons/ha output around 2-6 t/ha range.
# Inputs are normalized inside _norm.
CROP_BASELINES = {
    \"wheat\": 3.2,
    \"rice\": 4.0,
    \"maize\": 3.6,
    \"cotton\": 2.4,
    \"sugarcane\": 60.0,
    \"soybean\": 2.6,
    \"millet\": 1.8,
}

# Feature weights: how much each normalized input contributes to yield delta.
WEIGHTS = {
    \"rainfall\": 1.4,
    \"temperature\": -1.1,
    \"soil_n\": 0.9,
    \"soil_p\": 0.6,
    \"soil_k\": 0.5,
    \"water_index\": 1.0,
    \"seed_quality\": 0.8,
    \"pest_intensity\": -1.3,
}

# Optimal centers used to compute deviation-based normalization in [-1, 1].
OPTIMAL = {
    \"rainfall\": (800.0, 600.0),       # (center, half_range)
    \"temperature\": (24.0, 12.0),
    \"soil_n\": (250.0, 150.0),
    \"soil_p\": (60.0, 60.0),
    \"soil_k\": (200.0, 150.0),
    \"water_index\": (75.0, 35.0),
    \"seed_quality\": (80.0, 40.0),
    \"pest_intensity\": (15.0, 50.0),  # lower is better → handled by negative weight
}

PRETTY = {
    \"rainfall\": \"Rainfall (mm)\",
    \"temperature\": \"Temperature (°C)\",
    \"soil_n\": \"Soil Nitrogen\",
    \"soil_p\": \"Soil Phosphorus\",
    \"soil_k\": \"Soil Potassium\",
    \"water_index\": \"Water Availability\",
    \"seed_quality\": \"Seed Quality\",
    \"pest_intensity\": \"Pest Intensity\",
}


def _norm(name: str, value: float) -> float:
    \"\"\"Return signed proximity to optimum in [-1, 1]. 1 means at optimum.\"\"\"
    center, half = OPTIMAL[name]
    if half <= 0:
        return 0.0
    dev = abs(value - center) / half
    # 1 at optimum, decreases as deviation grows
    score = max(-1.0, 1.0 - dev)
    if name == \"pest_intensity\":
        # For pest, lower than center is better → invert sign so that low pest gives positive feature score
        score = max(-1.0, min(1.0, (center - value) / half))
    return score


def predict(features: dict, crop: str = \"wheat\") -> Tuple[float, float, float, float, List[dict], str]:
    \"\"\"
    Returns: (yield, lower, upper, confidence, feature_impacts, risk)
    \"\"\"
    base = CROP_BASELINES.get(crop.lower(), 3.0)
    contributions = []
    total_delta = 0.0
    confidence_score = 0.0

    for fname, weight in WEIGHTS.items():
        raw = float(features.get(fname, OPTIMAL[fname][0]))
        n = _norm(fname, raw)
        # Contribution toward yield in tons/ha
        contrib = n * abs(weight) * 0.5  # scale factor
        if weight < 0 and fname != \"pest_intensity\":
            contrib = -contrib
        # For pest, _norm already encodes direction so just multiply by abs(weight)
        if fname == \"pest_intensity\":
            contrib = n * abs(weight) * 0.5
        total_delta += contrib
        confidence_score += abs(n)
        contributions.append({
            \"name\": PRETTY[fname],
            \"value\": raw,
            \"impact\": round(contrib, 3),
            \"direction\": \"positive\" if contrib >= 0 else \"negative\",
        })

    yield_val = max(0.2, base + total_delta)
    # Uncertainty grows when inputs are far from optimum
    avg_optimality = confidence_score / len(WEIGHTS)  # 0..1
    confidence = max(40.0, min(98.0, 50.0 + avg_optimality * 50.0))
    sigma = yield_val * (0.18 - (confidence - 40.0) / 100.0 * 0.12)
    sigma = max(0.05, sigma)
    lower = max(0.1, yield_val - 1.96 * sigma)
    upper = yield_val + 1.96 * sigma

    if confidence >= 80 and yield_val >= base * 0.95:
        risk = \"low\"
    elif confidence >= 60 and yield_val >= base * 0.7:
        risk = \"moderate\"
    else:
        risk = \"high\"

    # Sort by absolute impact desc
    contributions.sort(key=lambda x: abs(x[\"impact\"]), reverse=True)
    return (
        round(yield_val, 2),
        round(lower, 2),
        round(upper, 2),
        round(confidence, 1),
        contributions,
        risk,
    )


def build_explanation(yield_val: float, risk: str, top_features: List[dict], crop: str) -> str:
    pos = [f for f in top_features if f[\"direction\"] == \"positive\"][:2]
    neg = [f for f in top_features if f[\"direction\"] == \"negative\"][:2]
    parts = [f\"Predicted {crop} yield is {yield_val} t/ha with {risk} risk.\"]
    if pos:
        parts.append(\"Positive drivers: \" + \", \".join(f[\"name\"] for f in pos) + \".\")
    if neg:
        parts.append(\"Limiting factors: \" + \", \".join(f[\"name\"] for f in neg) + \".\")
    return \" \".join(parts)


def build_recommendations(features: dict, top: List[dict]) -> List[str]:
    recs = []
    if features.get(\"water_index\", 100) < 55:
        recs.append(\"Augment irrigation: consider drip or sprinkler for the next 2 weeks.\")
    if features.get(\"pest_intensity\", 0) > 35:
        recs.append(\"Deploy IPM (integrated pest management); scout fields every 3 days.\")
    if features.get(\"soil_n\", 0) < 150:
        recs.append(\"Top-dress nitrogen (urea ~60 kg/ha) at the next vegetative stage.\")
    if features.get(\"soil_p\", 0) < 30:
        recs.append(\"Apply DAP/SSP to correct phosphorus deficiency.\")
    if features.get(\"soil_k\", 0) < 100:
        recs.append(\"Add potassium (MOP ~40 kg/ha) for grain filling support.\")
    if features.get(\"rainfall\", 0) < 350:
        recs.append(\"Switch to drought-tolerant seed variety for the next sowing window.\")
    if features.get(\"temperature\", 25) > 35:
        recs.append(\"Use mulching and shade nets to reduce heat stress.\")
    if features.get(\"seed_quality\", 100) < 60:
        recs.append(\"Source certified seed lots; current germination index is suboptimal.\")
    if not recs:
        recs.append(\"Conditions are well-balanced. Maintain monitoring cadence.\")
    return recs[:5]
"