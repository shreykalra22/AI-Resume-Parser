const Resume = require('../models/Resume')
const axios = require('axios')
const FormData = require('form-data')
const fs = require('fs')

/* -------------------------------------------------------------------------- */
/*                           Helper: Python Parser                            */
/* -------------------------------------------------------------------------- */

const callParser = async (filePath, originalName) => {
  const form = new FormData()

  form.append(
    'file',
    fs.createReadStream(filePath),
    {
      filename: originalName,
      contentType: originalName.endsWith('.pdf')
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }
  )

  const { data } = await axios.post(
    `${process.env.FASTAPI_URL}/parse`,
    form,
    {
      headers: form.getHeaders(),
      timeout: 30000,
    }
  )

  return data
}

/* -------------------------------------------------------------------------- */
/*                           Helper: ATS Scorer                               */
/* -------------------------------------------------------------------------- */

const callATSScorer = async (
  resumeText,
  jobDescription
) => {
  const { data } = await axios.post(
    `${process.env.FASTAPI_URL}/ats-score`,
    {
      resume_text: resumeText,
      job_description: jobDescription,
    },
    {
      timeout: 15000,
    }
  )

  return data
}

/* -------------------------------------------------------------------------- */
/*                              Helper: Cleanup                               */
/* -------------------------------------------------------------------------- */

// const cleanupFile = (filePath) => {
//   try {
//     if (fs.existsSync(filePath)) {
//       fs.unlinkSync(filePath)
//     }
//   } catch (err) {
//     console.error('Cleanup Error:', err.message)
//   }
// }

/* -------------------------------------------------------------------------- */
/*                             Upload Resume API                              */
/* -------------------------------------------------------------------------- */

const uploadResume = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      msg: 'No resume uploaded',
    })
  }

  const filePath = `uploads/${req.file.filename}`;
  const originalName = req.file.originalname
  const jobDescription =
    req.body.jobDescription || ''
    console.log("REQ FILE => ", req.file);

  try {
    console.log(
      `[Parser] Parsing ${originalName}`
    )

    let parsed

    try {
      parsed = await callParser(
        filePath,
        originalName
      )
    } catch (parserErr) {
      cleanupFile(filePath)

      console.error(
        '[Parser Error]',
        parserErr.message
      )

      return res.status(502).json({
        msg: 'Python parser service unavailable',
        detail: parserErr.message,
      })
    }

    let atsResult = null

    if (jobDescription.trim()) {
      try {
        atsResult = await callATSScorer(
          parsed.raw_text || '',
          jobDescription
        )
      } catch (atsErr) {
        console.warn(
          '[ATS Warning]',
          atsErr.message
        )
      }
    }

    const resumeDoc = {
  fileName: originalName,

  filePath,

  fileSize: req.file.size,

  mimeType: req.file.mimetype,

      parsedData: {
        name: parsed.name || 'Unknown',
        email: parsed.email || '',
        phone: parsed.phone || '',
        skills: parsed.skills || [],
        experience_years:
          parsed.experience_years || 0,
        education: parsed.education || [],
        experience: parsed.experience || [],
        projects: parsed.projects || [],
      },

      atsScore: atsResult
        ? {
            score:
              atsResult.ats_score || 0,

            keyword_match_pct:
              atsResult.keyword_match_percent ||
              0,

            matched_keywords:
              atsResult.matched_keywords || [],

            missing_keywords:
              atsResult.missing_keywords || [],

            total_jd_keywords:
              atsResult.total_jd_keywords || 0,

            matched_count:
              atsResult.matched_count || 0,
          }
        : null,

      jobDescription,

      rawText: (
        parsed.raw_text || ''
      ).slice(0, 5000),
    }

    const resume = await Resume.create(
      resumeDoc
    )

    console.log(
      `[MongoDB] Resume Saved: ${resume._id}`
    )

    // cleanupFile(filePath)

    return res.status(201).json({
      msg: 'Resume uploaded successfully',
      resume,
    })
  } catch (err) {
    // cleanupFile(filePath)

    console.error(
      '[Upload Error]',
      err.message
    )

    return res.status(500).json({
      msg: 'Resume upload failed',
    })
  }
}

/* -------------------------------------------------------------------------- */
/*                              Get All Resumes                               */
/* -------------------------------------------------------------------------- */

const getResumes = async (req, res) => {
  try {
    const { search, skill } = req.query

    const query = {}

    if (search) {
      query.$or = [
        {
          'parsedData.name': {
            $regex: search,
            $options: 'i',
          },
        },
        {
          'parsedData.email': {
            $regex: search,
            $options: 'i',
          },
        },
      ]
    }

    if (skill) {
      query['parsedData.skills'] = {
        $regex: skill,
        $options: 'i',
      }
    }

    const resumes = await Resume.find(query)
      .sort({ createdAt: -1 })

    return res.json({
      resumes,
    })
  } catch (err) {
    console.error(
      '[Get Resumes]',
      err.message
    )

    return res.status(500).json({
      msg: 'Failed to fetch resumes',
    })
  }
}

/* -------------------------------------------------------------------------- */
/*                             Get Resume By ID                               */
/* -------------------------------------------------------------------------- */

const getResumeById = async (req, res) => {
  try {
    const resume = await Resume.findById(
      req.params.id
    )

    if (!resume) {
      return res.status(404).json({
        msg: 'Resume not found',
      })
    }

    return res.json(resume)
  } catch (err) {
    console.error(
      '[Resume Detail]',
      err.message
    )

    return res.status(500).json({
      msg: 'Failed to fetch resume',
    })
  }
}

/* -------------------------------------------------------------------------- */
/*                              Re-score Resume                               */
/* -------------------------------------------------------------------------- */

const rescoreResume = async (req, res) => {
  try {
    const { id } = req.params
    const { jobDescription } = req.body

    const resume = await Resume.findById(id)

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found',
      })
    }

    const resumeText = `
      ${resume.parsedData?.name || ''}
      ${(resume.parsedData?.skills || []).join(
        ' '
      )}
      ${(resume.parsedData?.education || []).join(
        ' '
      )}
      ${(resume.parsedData?.projects || []).join(
        ' '
      )}
      ${(resume.parsedData?.experience || []).join(
        ' '
      )}
    `

    const atsResult = await callATSScorer(
      resumeText,
      jobDescription
    )

    resume.atsScore = {
      score: atsResult.ats_score || 0,

      keyword_match_pct:
        atsResult.keyword_match_percent || 0,

      matched_keywords:
        atsResult.matched_keywords || [],

      missing_keywords:
        atsResult.missing_keywords || [],

      total_jd_keywords:
        atsResult.total_jd_keywords || 0,

      matched_count:
        atsResult.matched_count || 0,
    }

    resume.jobDescription = jobDescription

    await resume.save()

    return res.json({
      success: true,
      atsScore: resume.atsScore,
      resume,
    })
  } catch (error) {
    console.error(
      'ATS RESCORE ERROR:',
      error.message
    )

    return res.status(500).json({
      success: false,
      message: 'ATS scoring failed',
      error: error.message,
    })
  }
}

/* -------------------------------------------------------------------------- */
/*                               Delete Resume                                */
/* -------------------------------------------------------------------------- */

const deleteResume = async (req, res) => {
  try {
    const resume =
      await Resume.findByIdAndDelete(
        req.params.id
      )

    if (!resume) {
      return res.status(404).json({
        msg: 'Resume not found',
      })
    }

    return res.json({
      success: true,
      msg: 'Resume deleted',
    })
  } catch (err) {
    console.error(
      '[Delete Resume]',
      err.message
    )

    return res.status(500).json({
      msg: 'Delete failed',
    })
  }
}

/* -------------------------------------------------------------------------- */
/*                                Analytics                                   */
/* -------------------------------------------------------------------------- */

const getAnalytics = async (req, res) => {
  try {
    const resumes = await Resume.find()

    const totalResumes = resumes.length

    const averageATS =
      resumes.reduce((acc, r) => {
        return (
          acc +
          (r.atsScore?.score || 0)
        )
      }, 0) / (totalResumes || 1)

    const topSkills = {}

    resumes.forEach((resume) => {
      ;(
        resume.parsedData?.skills || []
      ).forEach((skill) => {
        topSkills[skill] =
          (topSkills[skill] || 0) + 1
      })
    })

    return res.json({
      totalResumes,
      averageATS:
        averageATS.toFixed(1),
      topSkills,
    })
  } catch (err) {
    console.error(
      '[Analytics]',
      err.message
    )

    return res.status(500).json({
      msg: 'Analytics failed',
    })
  }
}

/* -------------------------------------------------------------------------- */
/*                               Module Export                                */
/* -------------------------------------------------------------------------- */

module.exports = {
  uploadResume,
  getResumes,
  getResumeById,
  rescoreResume,
  deleteResume,
  getAnalytics,
}