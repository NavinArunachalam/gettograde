const express = require('express');
const router = express.Router();

const User = require('../models/User');
const Classroom = require('../models/Classroom');
const ClassroomAnnouncement = require('../models/ClassroomAnnouncement');
const StudentRequest = require('../models/StudentRequest');
const Program = require('../models/Program');
const LiveMeeting = require('../models/LiveMeeting');
const ClassroomRecording = require('../models/ClassroomRecording');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const { protect, restrictTo } = require('../middleware/auth');
const mongoose = require('mongoose');
const multer = require('multer');
const https = require('https');
const urlModule = require('url');
const { cloudinary } = require('../config/cloudinary');

// Multer for R2 uploads: keep file in memory so we can pass it to S3 SDK
const r2Upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit for PDFs
});

const slugify = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

// Prevent CastError for all routes expecting a classroom :id
router.param('id', (req, res, next, id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid classroom ID format' });
  }
  next();
});

const resolveProgramId = async (program) => {
  if (!program) return null;
  if (mongoose.Types.ObjectId.isValid(program)) return program;

  const title = String(program).trim();
  if (!title) return null;

  const slug = slugify(title);
  let existingProgram = await Program.findOne({
    $or: [
      { title: new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      { slug }
    ]
  });

  if (!existingProgram) {
    existingProgram = await Program.create({
      title,
      slug,
      category: 'other',
      isPublished: true
    });
  }

  return existingProgram._id;
};

const normalizeClassroomRefs = async (payload) => {
  const normalized = { ...payload };

  if ('program' in normalized) {
    normalized.program = await resolveProgramId(normalized.program);
  }

  if ('batch' in normalized && normalized.batch && !mongoose.Types.ObjectId.isValid(normalized.batch)) {
    normalized.batch = null;
  }

  return normalized;
};

const attachMeetingsToClassrooms = async (classrooms) => {
  const list = Array.isArray(classrooms) ? classrooms : [classrooms];
  const classroomIds = list.map((classroom) => classroom._id);
  const meetings = await LiveMeeting.find({ classroom: { $in: classroomIds } })
    .populate('createdBy', 'fullName')
    .sort({ scheduledAt: 1 })
    .lean();

  const meetingsByClassroom = meetings.reduce((acc, meeting) => {
    const key = meeting.classroom.toString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(meeting);
    return acc;
  }, {});

  const withMeetings = list.map((classroom) => ({
    ...classroom,
    meetings: meetingsByClassroom[classroom._id.toString()] || []
  }));

  return Array.isArray(classrooms) ? withMeetings : withMeetings[0];
};

const manualPopulate = async (list, path, select = 'fullName email phone', filterDeleted = true) => {
  const isArray = Array.isArray(list);
  const items = isArray ? list : [list];
  if (items.length === 0) return list;

  const pathParts = path.split('.');
  const ids = new Set();
  items.forEach(item => {
    if (pathParts.length === 1) {
      const val = item[pathParts[0]];
      if (val && mongoose.Types.ObjectId.isValid(val)) ids.add(val.toString());
    } else if (pathParts.length === 2) {
      const array = item[pathParts[0]];
      if (Array.isArray(array)) {
        array.forEach(sub => {
          const val = sub[pathParts[1]];
          if (val && mongoose.Types.ObjectId.isValid(val)) ids.add(val.toString());
        });
      }
    }
  });

  const allIds = Array.from(ids);
  if (allIds.length === 0) return list;

  const users = await User.find({ _id: { $in: allIds } }).select(select + ' role isActive').lean();
  const userMap = users.reduce((acc, u) => { acc[u._id.toString()] = u; return acc; }, {});

  items.forEach(item => {
    if (pathParts.length === 1) {
      const val = item[pathParts[0]]?.toString();
      item[pathParts[0]] = (val && userMap[val]) ? userMap[val] : null;
    } else if (pathParts.length === 2) {
      const array = item[pathParts[0]];
      if (Array.isArray(array)) {
        const originalLength = array.length;
        const populated = array.map(sub => {
          const val = sub[pathParts[1]]?.toString();
          const user = (val && userMap[val]) ? userMap[val] : null;
          return { ...sub, [pathParts[1]]: user };
        });

        if (filterDeleted) {
          item[pathParts[0]] = populated.filter(sub => sub[pathParts[1]] !== null);
        } else {
          item[pathParts[0]] = populated;
        }
      }
    }
  });

  return isArray ? items : items[0];
};

const attachClassroomDetails = async (classrooms) => {
  const withMeetings = await attachMeetingsToClassrooms(classrooms);
  const list = Array.isArray(withMeetings) ? withMeetings : [withMeetings];
  const classroomIds = list.map((classroom) => classroom._id);

  // Fetch recordings with creator populated, student details will be manual
  const recordings = await ClassroomRecording.find({ classroom: { $in: classroomIds } })
    .populate('uploadedBy', 'fullName')
    .sort({ createdAt: -1 })
    .lean();

  // Manual populate student details in viewStats
  await manualPopulate(recordings, 'viewStats.student', 'fullName');

  const announcements = await ClassroomAnnouncement.find({ classroom: { $in: classroomIds } })
    .populate('author', 'fullName role avatar')
    .sort({ createdAt: -1 })
    .lean();

  // Fetch quizzes
  const quizzes = await Quiz.find({ classroom: { $in: classroomIds } })
    .sort({ createdAt: -1 })
    .lean();

  // Fetch quiz attempts for the classrooms
  const quizAttempts = await QuizAttempt.find({ classroom: { $in: classroomIds } })
    .sort({ createdAt: -1 })
    .lean();

  // Manual populate student details in quizAttempts
  await manualPopulate(quizAttempts, 'student', 'fullName email phone');

  const recordingsByClassroom = recordings.reduce((acc, rec) => {
    const key = rec.classroom.toString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(rec);
    return acc;
  }, {});

  const announcementsByClassroom = announcements.reduce((acc, announcement) => {
    const key = announcement.classroom.toString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(announcement);
    return acc;
  }, {});

  const quizzesByClassroom = quizzes.reduce((acc, q) => {
    const key = q.classroom.toString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(q);
    return acc;
  }, {});

  const attemptsByQuiz = quizAttempts.reduce((acc, att) => {
    const key = att.quiz.toString();
    if (!acc[key]) acc[key] = [];
    acc[key].push({
      ...att,
      id: att._id.toString(),
      studentName: att.student ? att.student.fullName : 'Student'
    });
    return acc;
  }, {});

  const withDetails = list.map((classroom) => ({
    ...classroom,
    recordings: (recordingsByClassroom[classroom._id.toString()] || []).map(r => ({
      ...r,
      id: r._id.toString()
    })),
    announcements: (announcementsByClassroom[classroom._id.toString()] || []).map(announcement => ({
      ...announcement,
      id: announcement._id.toString()
    })),
    quizzes: (quizzesByClassroom[classroom._id.toString()] || []).map(q => ({
      ...q,
      id: q._id.toString(),
      attempts: attemptsByQuiz[q._id.toString()] || []
    }))
  }));

  return Array.isArray(classrooms) ? withDetails : withDetails[0];
};

const getStudentRefId = (studentRef) => {
  if (!studentRef) return '';
  if (studentRef._id) return studentRef._id.toString();
  return studentRef.toString();
};

// GET /files → Proxy file from Cloudinary using Admin API
// Bypasses secured delivery by authenticating with API key/secret server-side
// GET /r2-proxy → Proxy download from R2 with server-side auth (key passed as query param)
router.get('/r2-proxy', async (req, res, next) => {
  try {
    const { key } = req.query;
    if (!key) {
      return res.status(400).json({ success: false, message: 'Missing key parameter' });
    }

    const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
    
    const s3Client = new S3Client({
      endpoint: process.env.S3_API,
      region: 'auto',
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      },
    });

    const bucket = process.env.CLOUDFLARE_R2_BUCKET;

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await s3Client.send(command);
    
    // Set appropriate headers
    const contentType = response.ContentType || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    if (response.ContentLength) {
      res.setHeader('Content-Length', response.ContentLength);
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (contentType === 'application/pdf') {
      res.setHeader('Content-Disposition', 'inline');
    }

    // Pipe the file stream to response
    response.Body.pipe(res);
  } catch (error) {
    console.error('[R2 Proxy] Error:', error);
    if (error.name === 'NoSuchKey') {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    next(error);
  }
});

// Legacy /files route - now redirects to R2 proxy for backward compatibility
router.get('/files', async (req, res, next) => {
  try {
    const { url } = req.query;
    console.log('[File Proxy] Received request for:', url);
    
    if (!url) {
      return res.status(400).json({ success: false, message: 'Missing ?url= parameter' });
    }

    const decodedUrl = decodeURIComponent(url);
    console.log('[File Proxy] Decoded URL:', decodedUrl);

    // Only allow proxying from Cloudinary for security
    if (!decodedUrl.includes('res.cloudinary.com/')) {
      return res.status(403).json({ success: false, message: 'Only Cloudinary URLs are allowed' });
    }

    // Extract public_id from the Cloudinary URL
    const urlMatch = decodedUrl.match(/\/v\d+\/(.+?)(?:\?|$)/);
    let publicId = urlMatch ? urlMatch[1] : null;
    if (!publicId) {
      const uploadMatch = decodedUrl.match(/\/upload\/(.+?)(?:\?|$)/);
      publicId = uploadMatch ? uploadMatch[1] : null;
    }

    console.log('[File Proxy] Extracted publicId:', publicId);

    if (!publicId) {
      return res.status(400).json({ success: false, message: 'Could not extract file ID from URL' });
    }

    // Use Cloudinary SDK's download_stream which authenticates server-side
    console.log('[File Proxy] Requesting download stream from Cloudinary...');
    const downloadStream = cloudinary.uploader.download_stream(publicId, {
      resource_type: 'raw'
    });

    // Wait for stream to start before setting headers
    downloadStream.on('response', (streamRes) => {
      console.log('[File Proxy] Cloudinary responded with status:', streamRes.statusCode);
      
      const contentType = streamRes.headers['content-type'] || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      if (streamRes.headers['content-length']) {
        res.setHeader('Content-Length', streamRes.headers['content-length']);
      }
      res.setHeader('Access-Control-Allow-Origin', '*');
      if (contentType === 'application/pdf') {
        res.setHeader('Content-Disposition', 'inline');
      }
      
      streamRes.pipe(res);
    });

    downloadStream.on('error', (err) => {
      console.error('[File Proxy] Download error:', err.message);
      console.error('[File Proxy] Error code:', err.code);
      console.error('[File Proxy] Full error:', err);
      if (!res.headersSent) {
        res.status(502).json({
          success: false,
          message: 'Failed to download file from Cloudinary: ' + err.message
        });
      }
    });

    downloadStream.on('end', () => {
      console.log('[File Proxy] Stream ended successfully');
    });
  } catch (error) {
    console.error('[File Proxy] Error:', error);
    next(error);
  }
});

function pipeFileResponse(sourceRes, targetRes) {
  const contentType = sourceRes.headers['content-type'] || 'application/octet-stream';
  targetRes.setHeader('Content-Type', contentType);
  if (sourceRes.headers['content-length']) {
    targetRes.setHeader('Content-Length', sourceRes.headers['content-length']);
  }
  targetRes.setHeader('Access-Control-Allow-Origin', '*');
  if (contentType === 'application/pdf') {
    targetRes.setHeader('Content-Disposition', 'inline');
  }
  sourceRes.pipe(targetRes);
}

// POST /upload-asset → Admin: Upload a classroom asset (PDF) to Cloudflare R2
router.post('/upload-asset', protect, restrictTo('admin', 'superadmin', 'faculty'), r2Upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Upload to Cloudflare R2 using AWS SDK v3 S3Client
    const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
    const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
    
    // R2 is S3-compatible
    const s3Client = new S3Client({
      endpoint: process.env.S3_API,
      region: 'auto',
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      },
    });

    const bucket = process.env.CLOUDFLARE_R2_BUCKET;
    const objectKey = `classroom-assets/${Date.now()}-${req.file.originalname}`;
    
    // Upload to R2 using PutObjectCommand
    await s3Client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: 'public-read',
    }));

    // Generate presigned download URL (valid for 7 days)
    // R2 buckets don't have public-read by default, so we use presigned URLs
    const downloadUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: bucket,
        Key: objectKey,
      }),
      { expiresIn: 7 * 24 * 60 * 60 } // 7 days
    );

// Return R2 proxy URL (frontend will use /api/v1/classrooms/r2-proxy?key=...)
    const proxyUrl = `/api/v1/classrooms/r2-proxy?key=${encodeURIComponent(objectKey)}`;
    
    console.log('[Upload Asset] Uploaded to R2, objectKey:', objectKey);
    console.log('[Upload Asset] Proxy URL:', proxyUrl);

    res.json({
      success: true,
      url: proxyUrl,
      publicId: objectKey
    });
  } catch (error) {
    console.error('[Upload Asset] Error:', error);
    next(error);
  }
});

// GET /my → Student: get classrooms I'm enrolled in
router.get('/my', protect, async (req, res, next) => {
  try {
    // Find active classrooms where student is enrolled
    const classrooms = await Classroom.find({
      'students.student': req.user._id,
      'students.status': 'active',
      status: 'active'
    })
      .populate('program')
      .populate('batch')
      .populate('instructors', 'fullName email avatar')
      .lean();

    await manualPopulate(classrooms, 'students.student', 'fullName email phone avatar role isVerified isActive');
    res.json({ success: true, classrooms: await attachClassroomDetails(classrooms) });
  } catch (error) {
    next(error);
  }
});

// GET /:id → Get classroom details + stats
router.get('/:id', protect, async (req, res, next) => {
  try {
    const classroom = await Classroom.findById(req.params.id)
      .populate('program')
      .populate('batch')
      .populate('createdBy', 'fullName email')
      .populate('instructors', 'fullName email avatar')
      .lean();

    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Classroom not found' });
    }

    await manualPopulate(classroom, 'students.student', 'fullName email phone avatar role isVerified isActive');

    // Verify student is enrolled or user is admin
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    const isFaculty = req.user.role === 'faculty';
    const isEnrolled = classroom.students.some(s => getStudentRefId(s.student) === req.user._id.toString() && s.status === 'active');

    if (!isAdmin && !isFaculty && !isEnrolled) {
      return res.status(403).json({ success: false, message: 'You are not enrolled in this classroom' });
    }

    res.json({ success: true, classroom: await attachClassroomDetails(classroom) });
  } catch (error) {
    next(error);
  }
});

// GET /:id/announcements → Get classroom announcements (newest first)
router.get('/:id/announcements', protect, async (req, res, next) => {
  try {
    const announcements = await ClassroomAnnouncement.find({ classroom: req.params.id })
      .populate('author', 'fullName role avatar')
      .sort({ createdAt: -1 });

    res.json({ success: true, announcements });
  } catch (error) {
    next(error);
  }
});

// Student only endpoint: mark announcement as read
// PUT /:id/announcements/:annoId/read → Student: mark announcement as read
router.put('/:id/announcements/:annoId/read', protect, async (req, res, next) => {
  try {
    const announcement = await ClassroomAnnouncement.findByIdAndUpdate(
      req.params.annoId,
      { $addToSet: { readBy: req.user._id } },
      { new: true }
    );
    res.json({ success: true, message: 'Announcement marked as read', announcement });
  } catch (error) {
    next(error);
  }
});

// Admin-only endpoints
router.use(protect);
router.use(restrictTo('admin', 'superadmin', 'faculty'));

// POST / → Admin: create classroom
router.post('/', async (req, res, next) => {
  try {
    const { name, description, thumbnail, code, program, batch, maxStudents, settings } = req.body;

    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Classroom name and code are required' });
    }

    const existingClassroom = await Classroom.findOne({ code });
    if (existingClassroom) {
      return res.status(400).json({ success: false, message: 'Classroom code already exists' });
    }

    const refs = await normalizeClassroomRefs({ program, batch });

    const classroom = await Classroom.create({
      name,
      description,
      thumbnail,
      code,
      createdBy: req.user._id,
      program: refs.program,
      batch: refs.batch,
      maxStudents: maxStudents || 100,
      settings: settings || {
        allowQuizLeaderboard: false,
        allowStudentChat: true,
        notifyOnUpload: true
      }
    });

    await classroom.populate('program batch instructors');

    res.status(201).json({ success: true, message: 'Classroom created successfully', classroom });
  } catch (error) {
    next(error);
  }
});

// GET / → Admin: list all classrooms
router.get('/', async (req, res, next) => {
  try {
    const { status, program } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (program) filter.program = await resolveProgramId(program);

    const classrooms = await Classroom.find(filter)
      .populate('program')
      .populate('batch')
      .populate('instructors', 'fullName')
      .sort({ createdAt: -1 })
      .lean();

    await manualPopulate(classrooms, 'students.student', 'fullName email phone avatar role isVerified isActive');
    res.json({ success: true, classrooms: await attachClassroomDetails(classrooms) });
  } catch (error) {
    next(error);
  }
});

// PUT /:id → Admin: update classroom info
router.put('/:id', async (req, res, next) => {
  try {
    const updates = await normalizeClassroomRefs(req.body);
    const classroom = await Classroom.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true }
    );
    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Classroom not found' });
    }
    await classroom.populate('program batch instructors');
    res.json({ success: true, message: 'Classroom updated successfully', classroom });
  } catch (error) {
    next(error);
  }
});

// PUT /:id/archive → Admin: toggle classroom archive status (archive ↔ active)
router.put('/:id/archive', async (req, res, next) => {
  try {
    const existing = await Classroom.findById(req.params.id).select('status');
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Classroom not found' });
    }
    const newStatus = existing.status === 'archived' ? 'active' : 'archived';
    const classroom = await Classroom.findByIdAndUpdate(
      req.params.id,
      { $set: { status: newStatus } },
      { new: true }
    ).populate('program batch instructors');
    const msg = newStatus === 'archived' ? 'Classroom archived successfully' : 'Classroom restored successfully';
    res.json({ success: true, message: msg, classroom });
  } catch (error) {
    next(error);
  }
});

// DELETE /:id → Admin: delete (archive) classroom
router.delete('/:id', async (req, res, next) => {
  try {
    const classroom = await Classroom.findByIdAndUpdate(
      req.params.id,
      { $set: { status: 'archived' } },
      { new: true }
    );
    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Classroom not found' });
    }
    res.json({ success: true, message: 'Classroom soft-deleted (archived) successfully' });
  } catch (error) {
    next(error);
  }
});

// GET /:id/students → Admin/Faculty: list all students in classroom
router.get('/:id/students', protect, restrictTo('admin', 'superadmin', 'faculty'), async (req, res, next) => {
  try {
    const classroom = await Classroom.findById(req.params.id).lean();

    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Classroom not found' });
    }

    await manualPopulate(classroom, 'students.student', 'fullName email phone avatar role isVerified isActive');
    res.json({ success: true, students: classroom.students });
  } catch (error) {
    next(error);
  }
});

// POST /:id/students/add → Admin/Faculty: add student(s) by studentIds array or by batchId
router.post('/:id/students/add', protect, restrictTo('admin', 'superadmin', 'faculty'), async (req, res, next) => {
  try {
    const { studentIds, batchId } = req.body;
    const classroom = await Classroom.findById(req.params.id);

    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Classroom not found' });
    }

    let usersToAdd = [];

    if (studentIds && Array.isArray(studentIds)) {
      usersToAdd = studentIds;
    } else if (batchId) {
      // Find all approved students assigned to this batch
      const requests = await StudentRequest.find({ batchAssigned: batchId, status: 'approved' });
      usersToAdd = requests.map(r => r.user.toString());
    }

    if (usersToAdd.length === 0) {
      return res.status(400).json({ success: false, message: 'No student IDs or batch ID provided' });
    }

    // Filter out students who are already in the classroom
    const currentStudentIds = classroom.students.map(s => s.student.toString());
    const newStudents = usersToAdd
      .filter(id => !currentStudentIds.includes(id))
      .map(id => ({ student: id, status: 'active', addedAt: new Date() }));

    if (newStudents.length > 0) {
      classroom.students.push(...newStudents);
      await classroom.save();
    }

    res.json({
      success: true,
      message: `Successfully added ${newStudents.length} new students to classroom`,
      classroom
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /:id/students/:studentId → Admin/Faculty: remove student from classroom
router.delete('/:id/students/:studentId', protect, restrictTo('admin', 'superadmin', 'faculty'), async (req, res, next) => {
  try {
    const classroom = await Classroom.findById(req.params.id);
    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Classroom not found' });
    }

    classroom.students = classroom.students.filter(s => s.student.toString() !== req.params.studentId);
    await classroom.save();

    res.json({ success: true, message: 'Student removed from classroom successfully', classroom });
  } catch (error) {
    next(error);
  }
});

// PUT /:id/students/:studentId/status → Admin/Faculty: hold/activate/remove student in classroom
router.put('/:id/students/:studentId/status', protect, restrictTo('admin', 'superadmin', 'faculty'), async (req, res, next) => {
  try {
    const { status } = req.body; // active, removed, held
    if (!['active', 'removed', 'held'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be active, removed, or held.' });
    }

    const classroom = await Classroom.findById(req.params.id);
    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Classroom not found' });
    }

    const studentRecord = classroom.students.find(s => s.student.toString() === req.params.studentId);
    if (!studentRecord) {
      return res.status(404).json({ success: false, message: 'Student not found in this classroom roster' });
    }

    studentRecord.status = status;
    await classroom.save();

    res.json({ success: true, message: `Student status inside classroom changed to ${status}`, classroom });
  } catch (error) {
    next(error);
  }
});

// POST /:id/announcements → Admin/Faculty: post announcement
router.post('/:id/announcements', protect, restrictTo('admin', 'superadmin', 'faculty'), async (req, res, next) => {
  try {
    const { content, attachments } = req.body;
    if (!content) {
      return res.status(400).json({ success: false, message: 'Announcement content is required' });
    }

    const classroom = await Classroom.findById(req.params.id);
    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Classroom not found' });
    }

    const announcement = await ClassroomAnnouncement.create({
      classroom: req.params.id,
      author: req.user._id,
      content,
      attachments: attachments || []
    });

    // Update totalAnnouncements stat
    await Classroom.findByIdAndUpdate(req.params.id, {
      $inc: { 'stats.totalAnnouncements': 1 }
    });

    // Populating author details
    const populated = await ClassroomAnnouncement.findById(announcement._id)
      .populate('author', 'fullName role avatar');

    // Socket notify students in classroom
    try {
      const { getIO } = require('../config/socket');
      const io = getIO();
      io.to(`classroom:${req.params.id}`).emit('announcement:new', populated);
    } catch (socketErr) {
      console.log('[Socket Error] Could not emit announcement alert:', socketErr.message);
    }

    res.status(201).json({ success: true, message: 'Announcement posted successfully', announcement: populated });
  } catch (error) {
    next(error);
  }
});

// PUT /:id/students/:studentId/certificate → Admin: upload certificate link for a student
router.put('/:id/students/:studentId/certificate', protect, async (req, res, next) => {
  try {
    const { certificateUrl } = req.body;
    const classroom = await Classroom.findById(req.params.id);
    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Classroom not found' });
    }

    const studentRecord = classroom.students.find(s => s.student.toString() === req.params.studentId);
    if (!studentRecord) {
      return res.status(404).json({ success: false, message: 'Student not found in this classroom' });
    }

    studentRecord.certificateUrl = certificateUrl || undefined;
    await classroom.save();

    res.json({ success: true, message: 'Certificate link updated', classroom });
  } catch (error) {
    next(error);
  }
});

// DELETE /:id/announcements/:annoId → Admin/Faculty: delete announcement
router.delete('/:id/announcements/:annoId', protect, restrictTo('admin', 'superadmin', 'faculty'), async (req, res, next) => {
  try {
    const announcement = await ClassroomAnnouncement.findByIdAndDelete(req.params.annoId);
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    // Decrement totalAnnouncements stat
    await Classroom.findByIdAndUpdate(req.params.id, {
      $inc: { 'stats.totalAnnouncements': -1 }
    });

    res.json({ success: true, message: 'Announcement deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
