// frontend/src/api/resumeStorage.js
// Client-side persistence layer.
// Replaces MongoDB — stores parsed resumes in localStorage.
// FastAPI is stateless, so the browser holds the data between sessions.

const STORAGE_KEY = "ai_resume_parser_resumes";

// ── Helpers ───────────────────────────────────────────────────────────────────

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeAll(resumes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(resumes));
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Save a newly parsed resume.
 * @param {object} parsedData  — response from FastAPI /parse-and-score
 * @param {string} fileName    — original filename
 * @param {string} jobDescription — job description used for ATS (may be empty)
 * @returns {object} the saved resume record with generated id
 */
export function saveResume(parsedData, fileName, jobDescription = "") {
  const resumes = readAll();

  const record = {
    id:            generateId(),
    fileName,
    jobDescription,
    createdAt:     new Date().toISOString(),
    parsedData:    parsedData.parsed   || parsedData,  // handle both shapes
    atsScore:      parsedData.ats_score || null,
  };

  resumes.unshift(record);  // newest first
  writeAll(resumes);
  return record;
}

/**
 * Return all saved resumes, newest first.
 */
export function getAllResumes() {
  return readAll();
}

/**
 * Return a single resume by id.
 */
export function getResumeById(id) {
  return readAll().find(r => r.id === id) || null;
}

/**
 * Update the ATS score on an existing resume record.
 */
export function updateAtsScore(id, atsScore, jobDescription) {
  const resumes = readAll();
  const idx     = resumes.findIndex(r => r.id === id);
  if (idx === -1) return null;
  resumes[idx].atsScore      = atsScore;
  resumes[idx].jobDescription = jobDescription;
  writeAll(resumes);
  return resumes[idx];
}

/**
 * Delete a resume by id.
 */
export function deleteResume(id) {
  const resumes = readAll().filter(r => r.id !== id);
  writeAll(resumes);
}

/**
 * Compute analytics from stored resumes.
 * Replaces /resumes/analytics/summary MongoDB aggregation.
 */
export function getAnalytics() {
  const resumes = readAll();

  // Skill frequency
  const skillMap = {};
  resumes.forEach(r => {
    (r.parsedData?.skills || []).forEach(s => {
      skillMap[s] = (skillMap[s] || 0) + 1;
    });
  });
  const skillFrequency = Object.entries(skillMap)
    .map(([skill, count]) => ({ skill, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // Average ATS score
  const scored  = resumes.filter(r => r.atsScore?.ats_score != null);
  const avgAts  = scored.length
    ? +(scored.reduce((s, r) => s + r.atsScore.ats_score, 0) / scored.length).toFixed(1)
    : null;

  // Top candidates by ATS score
  const topCandidates = [...resumes]
    .filter(r => r.atsScore?.ats_score != null)
    .sort((a, b) => b.atsScore.ats_score - a.atsScore.ats_score)
    .slice(0, 10);

  return {
    totalResumes:   resumes.length,
    avgAtsScore:    avgAts,
    skillFrequency,
    topCandidates,
  };
}