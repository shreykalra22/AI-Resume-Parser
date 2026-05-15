import spacy
import pdfplumber
import re
from docx import Document

SKILL_KEYWORDS = [
    "python","javascript","react","node.js","mongodb","sql","aws","docker",
    "kubernetes","machine learning","deep learning","fastapi","express",
    "java","c++","tensorflow","pytorch","git","linux","html","css","tailwind",
    "typescript","next.js","graphql","redis","postgresql","firebase","flutter"
]

def extract_text_pdf(path):
    text = ""
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            text += page.extract_text() or ""
    return text

def extract_text_docx(path):
    doc = Document(path)
    return "\n".join([p.text for p in doc.paragraphs])

def extract_email(text):
    match = re.search(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", text)
    return match.group() if match else ""

def extract_phone(text):
    match = re.search(r"(\+?\d[\d\s\-().]{7,15}\d)", text)
    return match.group() if match else ""

def extract_skills(text):
    text_lower = text.lower()
    return [s for s in SKILL_KEYWORDS if s in text_lower]

def extract_name(text, nlp):
    doc = nlp(text[:500])
    for ent in doc.ents:
        if ent.label_ == "PERSON":
            return ent.text
    return text.split("\n")[0].strip()

def extract_experience_years(text):
    matches = re.findall(r"(\d+)\+?\s*years?\s*(of)?\s*(experience)?", text, re.I)
    if matches:
        return max(int(m[0]) for m in matches)
    return 0

def extract_section(text, keywords):
    lines = text.split("\n")
    section, capturing = [], False

    for line in lines:
        if any(kw in line.lower() for kw in keywords):
            capturing = True
            continue

        elif capturing and any(
            kw in line.lower() for kw in
            ["education","experience","skills","projects","certifications","summary"]
            if kw not in keywords
        ):
            break

        elif capturing and line.strip():
            section.append(line.strip())

    return section

def parse_from_text(text, nlp):
    return {
        "name": extract_name(text, nlp),
        "email": extract_email(text),
        "phone": extract_phone(text),
        "skills": extract_skills(text),
        "experience_years": extract_experience_years(text),
        "education": extract_section(text, ["education","academic"]),
        "experience": extract_section(text, ["experience","employment","work history"]),
        "projects": extract_section(text, ["projects","portfolio"]),
        "raw_text": text[:3000]
    }

def parse_resume(path, suffix, nlp):
    text = extract_text_pdf(path) if suffix == ".pdf" else extract_text_docx(path)
    return parse_from_text(text, nlp)