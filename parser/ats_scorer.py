import re
from typing import List

def tokenize(text: str) -> List[str]:
    return re.findall(r"\b[a-z][a-z0-9+#.]*\b", text.lower())

def calculate_ats_score(resume_text: str, job_description: str) -> dict:
    jd_tokens = set(tokenize(job_description))
    resume_tokens = set(tokenize(resume_text))

    # Remove common stopwords
    stopwords = {"and","the","of","in","to","a","for","is","with","on","an","or"}
    jd_keywords = jd_tokens - stopwords
    matched = jd_keywords & resume_tokens
    missing = jd_keywords - resume_tokens

    score = round((len(matched) / len(jd_keywords)) * 100, 1) if jd_keywords else 0

    # Bonus points for formatting signals
    formatting_bonus = 0
    if any(h in resume_text.lower() for h in ["experience","education","skills"]):
        formatting_bonus += 5
    if re.search(r"\b(achieved|led|built|improved|reduced|increased)\b", resume_text, re.I):
        formatting_bonus += 5

    final_score = min(score + formatting_bonus, 100)

    return {
        "ats_score": round(final_score, 1),
        "matched_keywords": sorted(list(matched))[:20],
        "missing_keywords": sorted(list(missing))[:20],
        "keyword_match_percent": round(score, 1),
        "total_jd_keywords": len(jd_keywords),
        "matched_count": len(matched)
    }