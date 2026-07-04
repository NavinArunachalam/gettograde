const express = require('express');
const router = express.Router();
const multer = require('multer');
const mongoose = require('mongoose');

const ClassroomRecording = require('../models/ClassroomRecording');
const Classroom = require('../models/Classroom');
const { protect, restrictTo } = require('../middleware/auth');
const {
  uploadFileToCloudflareR2,
  deleteFileFromCloudflareR2,
  generatePresignedUploadUrl,
  createMultipartUpload,
  generatePresignedPartUrl,
  completeMultipartUpload,
  abortMultipartUpload,
} = require('../config/cloudflare');

// ✅ Memory storage — file never touches disk
const upload = multer({ storage: multer.memoryStorage() });

// ─── ObjectId validation helper ───────────────────────────────────────────────
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// =============================================================================
// STATIC NAMED ROUTES — must be defined BEFORE any /:id dynamic routes
// =============================================================================

// GET /classroom/:classroomId → Get all recordings for a classroom
router.get('/classroom/:classroomId', protect, async (req, res, next) => {
  try {
    const classroom = await Classroom.findById(req.params.classroomId);
    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Classroom not found' });
    }

    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    const isFaculty = req.user.role === 'faculty';
    const isEnrolled = classroom.students.some(
      (s) => s.student.toString() === req.user._id.toString() && s.status === 'active'
    );
    if (!isAdmin && !isFaculty && !isEnrolled) {
      return res.status(403).json({ success: false, message: 'You are not enrolled in this classroom' });
    }

    const filter = { classroom: req.params.classroomId };
    if (!isAdmin) filter.isPublished = true;

    const recordings = await ClassroomRecording.find(filter)
      .populate('uploadedBy', 'fullName')
      .sort({ createdAt: -1 });

    res.json({ success: true, recordings });
  } catch (error) {
    next(error);
  }
});

// GET /classroom/:classroomId/analytics → Admin: all recordings' stats for classroom
router.get('/classroom/:classroomId/analytics', protect, restrictTo('admin', 'superadmin'), async (req, res, next) => {
  try {
    const recordings = await ClassroomRecording.find({ classroom: req.params.classroomId })
      .populate('viewStats.student', 'fullName email');
    res.json({ success: true, recordings });
  } catch (error) {
    next(error);
  }
});

// POST /upload-url → Admin: Get Mux direct upload URL or mock
router.post('/upload-url', protect, restrictTo('admin', 'superadmin'), async (req, res, next) => {
  try {
    res.json({
      success: true,
      isMock: true,
      uploadUrl: `${process.env.API_BASE_URL || ''}/api/v1/recordings/classroom/mock-upload`,
      playbackId: `mock_playback_id_${Date.now()}`,
      assetId: `mock_asset_id_${Date.now()}`
    });
  } catch (error) {
    next(error);
  }
});

// POST /presigned-url → Admin: Generate a presigned R2 PUT URL for direct browser upload
// The video is uploaded directly from the browser to Cloudflare R2 — Railway is NOT involved
// in transferring the bytes, so there are no timeouts even for 3 GB files.
router.post('/presigned-url', protect, restrictTo('admin', 'superadmin'), async (req, res, next) => {
  try {
    const { classroom, filename, contentType } = req.body;

    if (!classroom || !filename) {
      return res.status(400).json({ success: false, message: 'classroom and filename are required' });
    }
    if (!isValidId(classroom)) {
      return res.status(400).json({ success: false, message: 'Invalid classroom ID' });
    }

    // Sanitise filename — strip path separators that could break R2 keys
    const safeName = filename.replace(/[/\\]/g, '_');
    const objectKey = `classroom-recordings/${classroom}/${Date.now()}-${safeName}`;

    const { uploadUrl, publicUrl } = await generatePresignedUploadUrl(
      objectKey,
      contentType || 'video/mp4',
      3600 // 1-hour window — enough for very large uploads
    );

    res.json({ success: true, uploadUrl, objectKey, publicUrl });
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// MULTIPART UPLOAD ROUTES (100 MB chunks — supports 1 GB–3 GB+ videos)
// Browser uploads each chunk directly to R2 via a per-part presigned URL.
// Railway only orchestrates (tiny JSON) — never touches the video bytes.
// =============================================================================

// POST /multipart/initiate → Admin: start a multipart upload, get uploadId + objectKey
router.post('/multipart/initiate', protect, restrictTo('admin', 'superadmin'), async (req, res, next) => {
  try {
    const { classroom, filename, contentType } = req.body;

    if (!classroom || !filename) {
      return res.status(400).json({ success: false, message: 'classroom and filename are required' });
    }
    if (!isValidId(classroom)) {
      return res.status(400).json({ success: false, message: 'Invalid classroom ID' });
    }

    const safeName = filename.replace(/[/\\]/g, '_');
    const objectKey = `classroom-recordings/${classroom}/${Date.now()}-${safeName}`;

    const uploadId = await createMultipartUpload(objectKey, contentType || 'video/mp4');

    const { getR2ObjectUrl } = require('../config/cloudflare');
    const publicUrl = getR2ObjectUrl(objectKey);

    res.json({ success: true, uploadId, objectKey, publicUrl });
  } catch (error) {
    next(error);
  }
});

// POST /multipart/presign-part → Admin: get a presigned URL for one chunk (partNumber)
router.post('/multipart/presign-part', protect, restrictTo('admin', 'superadmin'), async (req, res, next) => {
  try {
    const { objectKey, uploadId, partNumber } = req.body;

    if (!objectKey || !uploadId || partNumber == null) {
      return res.status(400).json({ success: false, message: 'objectKey, uploadId and partNumber are required' });
    }

    const num = parseInt(partNumber, 10);
    if (isNaN(num) || num < 1 || num > 10000) {
      return res.status(400).json({ success: false, message: 'partNumber must be 1–10 000' });
    }

    // 2-hour window per part (100 MB on a slow connection can take >1 h)
    const presignedUrl = await generatePresignedPartUrl(objectKey, uploadId, num, 7200);

    res.json({ success: true, presignedUrl });
  } catch (error) {
    next(error);
  }
});

// POST /multipart/complete → Admin: tell R2 to assemble all uploaded parts
router.post('/multipart/complete', protect, restrictTo('admin', 'superadmin'), async (req, res, next) => {
  try {
    const { objectKey, uploadId, parts } = req.body;

    if (!objectKey || !uploadId || !Array.isArray(parts) || parts.length === 0) {
      return res.status(400).json({ success: false, message: 'objectKey, uploadId, and parts[] are required' });
    }

    // Ensure parts are sorted by PartNumber (R2 requirement)
    const sortedParts = [...parts].sort((a, b) => a.PartNumber - b.PartNumber);

    const publicUrl = await completeMultipartUpload(objectKey, uploadId, sortedParts);

    res.json({ success: true, publicUrl });
  } catch (error) {
    next(error);
  }
});

// POST /multipart/abort → Admin: cancel upload and free partial storage on R2
router.post('/multipart/abort', protect, restrictTo('admin', 'superadmin'), async (req, res, next) => {
  try {
    const { objectKey, uploadId } = req.body;

    if (!objectKey || !uploadId) {
      return res.status(400).json({ success: false, message: 'objectKey and uploadId are required' });
    }

    await abortMultipartUpload(objectKey, uploadId);

    res.json({ success: true, message: 'Multipart upload aborted and storage freed' });
  } catch (error) {
    next(error);
  }
});

// POST /save-recording → Admin/Faculty: Save metadata AFTER the browser PUT to R2 completes
router.post('/save-recording', protect, restrictTo('admin', 'superadmin', 'faculty'), async (req, res, next) => {
  try {
    const { classroom, title, description, duration, isPublished, objectKey, publicUrl, chapters } = req.body;

    if (!classroom || !title || !objectKey) {
      return res.status(400).json({ success: false, message: 'classroom, title, and objectKey are required' });
    }
    if (!isValidId(classroom)) {
      return res.status(400).json({ success: false, message: 'Invalid classroom ID' });
    }

    let parsedChapters = [];
    if (chapters) {
      try {
        parsedChapters = typeof chapters === 'string' ? JSON.parse(chapters) : chapters;
      } catch {
        parsedChapters = [];
      }
    }

    const { getR2ObjectUrl } = require('../config/cloudflare');
    const resolvedUrl = publicUrl || getR2ObjectUrl(objectKey);

    const recording = await ClassroomRecording.create({
      classroom,
      title,
      description,
      uploadedBy: req.user._id,
      storageProvider: 'cloudflare',
      cloudflareKey: objectKey,
      cloudflareUrl: resolvedUrl,
      isPublished: isPublished === true || isPublished === 'true',
      chapters: parsedChapters,
      muxStatus: 'ready',
      duration: duration ? parseInt(duration, 10) : 0,
      thumbnail: '/default-video-thumb.jpg',
      security: {
        signedUrlRequired: false,
        urlExpiryHours: 0,
        watermark: true,
        downloadBlocked: true,
        screenRecordDetect: false,
        devToolsBlocked: false,
      },
    });

    await Classroom.findByIdAndUpdate(classroom, {
      $inc: { 'stats.totalRecordings': 1 },
    });

    res.status(201).json({
      success: true,
      message: 'Recording saved successfully',
      recording,
    });
  } catch (error) {
    next(error);
  }
});

// POST /mock-upload → Admin/Faculty: Local mock upload (memory-based, no disk write)
router.post('/mock-upload', protect, restrictTo('admin', 'superadmin', 'faculty'), upload.single('video'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No video file provided' });
    }
    res.json({
      success: true,
      playbackId: `mock_playback_${Date.now()}`,
      assetId: `mock_asset_${Date.now()}`,
      duration: 120
    });
  } catch (error) {
    next(error);
  }
});

// POST /upload-cloudflare → Admin/Faculty: upload recording DIRECTLY to Cloudflare R2
router.post('/upload-cloudflare', protect, restrictTo('admin', 'superadmin', 'faculty'), upload.single('video'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No video file provided' });
    }

    const { classroom, title, description, duration, isPublished } = req.body;

    if (!classroom || !title) {
      return res.status(400).json({ success: false, message: 'Classroom and title are required' });
    }

    // Validate classroom is a real ObjectId
    if (!isValidId(classroom)) {
      return res.status(400).json({ success: false, message: 'Invalid classroom ID' });
    }

    let chapters = [];
    if (req.body.chapters) {
      try {
        chapters = typeof req.body.chapters === 'string' ? JSON.parse(req.body.chapters) : req.body.chapters;
      } catch {
        chapters = [];
      }
    }
    const published = isPublished === 'true' || isPublished === true;

    // Upload buffer directly to R2 — no temp file
    const objectKey = `classroom-recordings/${classroom}/${Date.now()}-${req.file.originalname}`;
    const uploadResult = await uploadFileToCloudflareR2(
      req.file.buffer,
      objectKey,
      req.file.mimetype
    );

    const recording = await ClassroomRecording.create({
      classroom,
      title,
      description,
      uploadedBy: req.user._id,
      storageProvider: 'cloudflare',
      cloudflareKey: objectKey,
      cloudflareUrl: uploadResult.url,
      isPublished: published,
      chapters,
      muxStatus: 'ready',
      duration: duration ? parseInt(duration, 10) : 0,
      thumbnail: '/default-video-thumb.jpg',
      security: {
        signedUrlRequired: false,
        urlExpiryHours: 0,
        watermark: true,
        downloadBlocked: true,
        screenRecordDetect: false,
        devToolsBlocked: false
      }
    });

    await Classroom.findByIdAndUpdate(classroom, {
      $inc: { 'stats.totalRecordings': 1 }
    });

    res.status(201).json({
      success: true,
      message: 'Recording uploaded to Cloudflare R2 successfully',
      recording
    });
  } catch (error) {
    next(error);
  }
});

// POST / → Admin/Faculty: save recording metadata after Mux upload
router.post('/', protect, restrictTo('admin', 'superadmin', 'faculty'), async (req, res, next) => {
  try {
    const { classroom, title, description, muxAssetId, muxPlaybackId, duration, security } = req.body;

    if (!classroom || !title || !muxPlaybackId) {
      return res.status(400).json({ success: false, message: 'Classroom, title, and playbackId are required' });
    }

    const recording = await ClassroomRecording.create({
      classroom,
      title,
      description,
      uploadedBy: req.user._id,
      muxAssetId: muxAssetId || 'mock_asset_id',
      muxPlaybackId,
      muxStatus: 'ready',
      duration: duration || 0,
      thumbnail: muxPlaybackId.startsWith('/uploads/')
        ? '/default-video-thumb.jpg'
        : `https://image.mux.com/${muxPlaybackId}/thumbnail.jpg`,
      security: security || {
        signedUrlRequired: true,
        urlExpiryHours: 6,
        watermark: true,
        downloadBlocked: true,
        screenRecordDetect: true,
        devToolsBlocked: true
      }
    });

    await Classroom.findByIdAndUpdate(classroom, {
      $inc: { 'stats.totalRecordings': 1 }
    });

    res.status(201).json({ success: true, message: 'Recording saved successfully', recording });
  } catch (error) {
    next(error);
  }
});

// POST /reuse → Admin/Faculty: reuse/duplicate recording from another classroom (tracking is unique per class)
router.post('/reuse', protect, restrictTo('admin', 'superadmin', 'faculty'), async (req, res, next) => {
  try {
    const { sourceRecordingId, targetClassroomId, title, description } = req.body;

    if (!sourceRecordingId || !targetClassroomId) {
      return res.status(400).json({ success: false, message: 'sourceRecordingId and targetClassroomId are required' });
    }

    if (!isValidId(sourceRecordingId) || !isValidId(targetClassroomId)) {
      return res.status(400).json({ success: false, message: 'Invalid sourceRecordingId or targetClassroomId' });
    }

    const sourceRec = await ClassroomRecording.findById(sourceRecordingId);
    if (!sourceRec) {
      return res.status(404).json({ success: false, message: 'Source recording not found' });
    }

    const targetClassroom = await Classroom.findById(targetClassroomId);
    if (!targetClassroom) {
      return res.status(404).json({ success: false, message: 'Target classroom not found' });
    }

    // Create a new ClassroomRecording document linked to the target classroom,
    // sharing the same video details but with a fresh/empty viewStats tracker
    const newRec = await ClassroomRecording.create({
      classroom: targetClassroomId,
      title: title || sourceRec.title,
      description: description || sourceRec.description,
      uploadedBy: req.user._id,
      storageProvider: sourceRec.storageProvider,
      muxAssetId: sourceRec.muxAssetId,
      muxPlaybackId: sourceRec.muxPlaybackId,
      muxStatus: sourceRec.muxStatus,
      cloudflareKey: sourceRec.cloudflareKey,
      cloudflareUrl: sourceRec.cloudflareUrl,
      duration: sourceRec.duration,
      thumbnail: sourceRec.thumbnail,
      chapters: sourceRec.chapters ? sourceRec.chapters.map(c => ({
        title: c.title,
        startTimeSec: c.startTimeSec,
        order: c.order
      })) : [],
      security: { ...sourceRec.security },
      viewStats: [], // UNIQUE stats list for target classroom tracking
      isPublished: false, // Default to draft so admin can decide when to publish
      version: 1
    });

    // Increment recording counts in target classroom
    await Classroom.findByIdAndUpdate(targetClassroomId, {
      $inc: { 'stats.totalRecordings': 1 }
    });

    res.status(201).json({
      success: true,
      message: 'Recording reused successfully in target classroom',
      recording: newRec
    });
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// DYNAMIC /:id ROUTES — must be defined AFTER all static named routes
// =============================================================================

// GET /:id → Get recording detail + signed playback token
router.get('/:id', protect, async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid recording ID' });
    }
    const recording = await ClassroomRecording.findById(req.params.id)
      .populate('classroom')
      .populate('uploadedBy', 'fullName');

    if (!recording) {
      return res.status(404).json({ success: false, message: 'Recording not found' });
    }

    const classroom = await Classroom.findById(recording.classroom);
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    const isFaculty = req.user.role === 'faculty';
    const isEnrolled = classroom
      ? classroom.students.some(
          (s) => s.student.toString() === req.user._id.toString() && s.status === 'active'
        )
      : false;

    if (!isAdmin && !isFaculty && !isEnrolled) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.json({
      success: true,
      recording,
      playbackUrl: recording.storageProvider === 'cloudflare'
        ? `/api/v1/recordings/classroom/${recording._id}/stream`
        : undefined
    });
  } catch (error) {
    next(error);
  }
});

// GET /:id/stream → Stream classroom recording from Cloudflare R2
router.get('/:id/stream', protect, async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid recording ID' });
    }
    const recording = await ClassroomRecording.findById(req.params.id).populate('classroom');
    if (!recording) {
      return res.status(404).json({ success: false, message: 'Recording not found' });
    }

    const classroom = await Classroom.findById(recording.classroom);
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    const isFaculty = req.user.role === 'faculty';
    const isEnrolled = classroom
      ? classroom.students.some(
          (s) => s.student.toString() === req.user._id.toString() && s.status === 'active'
        )
      : false;

    if (!isAdmin && !isFaculty && !isEnrolled) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (recording.storageProvider !== 'cloudflare' || !recording.cloudflareKey) {
      return res.status(404).json({ success: false, message: 'Stream not available for this recording' });
    }

    try {
      const { getS3Client } = require('../config/cloudflare');
      const { GetObjectCommand } = require('@aws-sdk/client-s3');

      const s3 = getS3Client();
      const command = new GetObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET,
        Key: recording.cloudflareKey,
        Range: req.headers.range,
      });

      const s3Response = await s3.send(command);

      if (s3Response.ContentType) res.setHeader('Content-Type', s3Response.ContentType);
      if (s3Response.ContentLength) res.setHeader('Content-Length', s3Response.ContentLength);
      if (s3Response.ContentRange) res.setHeader('Content-Range', s3Response.ContentRange);
      if (s3Response.AcceptRanges) res.setHeader('Accept-Ranges', s3Response.AcceptRanges);

      res.status(s3Response.$metadata.httpStatusCode || 200);
      s3Response.Body.pipe(res);
    } catch (s3Error) {
      console.error('[S3 Streaming Error]:', s3Error.message);
      res.status(s3Error.$metadata?.httpStatusCode || 500).send(s3Error.message);
    }
  } catch (error) {
    next(error);
  }
});

// GET /:id/progress/my → Student: get my watch progress
router.get('/:id/progress/my', protect, async (req, res, next) => {
  try {
    const recording = await ClassroomRecording.findById(req.params.id);
    if (!recording) {
      return res.status(404).json({ success: false, message: 'Recording not found' });
    }
    const userStats = recording.viewStats.find(
      (v) => v.student.toString() === req.user._id.toString()
    );
    res.json({
      success: true,
      progress: userStats || { totalWatchedSec: 0, lastPosition: 0, rewatchCount: 0 }
    });
  } catch (error) {
    next(error);
  }
});

// GET /:id/analytics → Admin: per-student analytics for a recording
router.get('/:id/analytics', protect, restrictTo('admin', 'superadmin'), async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid recording ID' });
    }
    const recording = await ClassroomRecording.findById(req.params.id)
      .populate('viewStats.student', 'fullName email avatar');

    if (!recording) {
      return res.status(404).json({ success: false, message: 'Recording not found' });
    }

    res.json({ success: true, viewStats: recording.viewStats });
  } catch (error) {
    next(error);
  }
});

// POST /:id/progress → Student: update watch progress
router.post('/:id/progress', protect, async (req, res, next) => {
  try {
    const { position, watchedSec, completed } = req.body;
    const recording = await ClassroomRecording.findById(req.params.id);
    if (!recording) {
      return res.status(404).json({ success: false, message: 'Recording not found' });
    }

    const safePosition = Math.max(0, Number(position) || 0);
    const safeWatchedSec = Math.min(300, Math.max(0, Number(watchedSec) || 0));
    const isCompleted = !!completed || (recording.duration > 0 && safePosition >= recording.duration * 0.9);

    let userStatsIndex = recording.viewStats.findIndex(
      (v) => v.student.toString() === req.user._id.toString()
    );

    if (userStatsIndex === -1) {
      recording.viewStats.push({
        student: req.user._id,
        totalWatchedSec: safeWatchedSec,
        lastPosition: safePosition,
        rewatchCount: isCompleted ? 1 : 0,
        completedAt: isCompleted ? new Date() : null,
        sessions: [{
          startedAt: new Date(Date.now() - safeWatchedSec * 1000),
          endedAt: new Date(),
          watchedSec: safeWatchedSec
        }]
      });
      userStatsIndex = recording.viewStats.length - 1;
    } else {
      const stats = recording.viewStats[userStatsIndex];
      stats.lastPosition = safePosition;
      stats.totalWatchedSec += safeWatchedSec;
      if (isCompleted && !stats.completedAt) {
        stats.completedAt = new Date();
        stats.rewatchCount += 1;
      }
      stats.sessions.push({
        startedAt: new Date(Date.now() - safeWatchedSec * 1000),
        endedAt: new Date(),
        watchedSec: safeWatchedSec
      });
    }

    await recording.save();
    res.json({
      success: true,
      message: 'Watch progress updated',
      progress: recording.viewStats[userStatsIndex]
    });
  } catch (error) {
    next(error);
  }
});

// POST /:id/chapters → Admin: save chapters
router.post('/:id/chapters', protect, restrictTo('admin', 'superadmin'), async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid recording ID' });
    }
    const { chapters } = req.body;
    const recording = await ClassroomRecording.findByIdAndUpdate(
      req.params.id,
      { $set: { chapters } },
      { new: true }
    );
    res.json({ success: true, message: 'Chapters updated successfully', recording });
  } catch (error) {
    next(error);
  }
});

// PUT /:id → Admin/Faculty: update title, description, chapters
router.put('/:id', protect, restrictTo('admin', 'superadmin', 'faculty'), async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid recording ID' });
    }
    const recording = await ClassroomRecording.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    if (!recording) {
      return res.status(404).json({ success: false, message: 'Recording not found' });
    }
    res.json({ success: true, message: 'Recording updated successfully', recording });
  } catch (error) {
    next(error);
  }
});

// PUT /:id/publish → Admin/Faculty: publish recording + notify students
router.put('/:id/publish', protect, restrictTo('admin', 'superadmin', 'faculty'), async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid recording ID' });
    }
    const recording = await ClassroomRecording.findById(req.params.id);
    if (!recording) {
      return res.status(404).json({ success: false, message: 'Recording not found' });
    }

    recording.isPublished = true;
    recording.notified = true;
    recording.notifiedAt = new Date();
    await recording.save();

    try {
      const { getIO } = require('../config/socket');
      const io = getIO();
      io.to(`classroom:${recording.classroom}`).emit('recording:published', {
        recordingId: recording._id,
        title: recording.title
      });
    } catch (socketErr) {
      console.log('[Socket Error] Could not emit recording published alert:', socketErr.message);
    }

    res.json({ success: true, message: 'Recording published and students notified' });
  } catch (error) {
    next(error);
  }
});

// DELETE /:id → Admin/Faculty: delete recording
router.delete('/:id', protect, restrictTo('admin', 'superadmin', 'faculty'), async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid recording ID' });
    }
    const recording = await ClassroomRecording.findById(req.params.id);
    if (!recording) {
      return res.status(404).json({ success: false, message: 'Recording not found' });
    }

    await Classroom.findByIdAndUpdate(recording.classroom, {
      $inc: { 'stats.totalRecordings': -1 }
    });

    if (recording.storageProvider === 'cloudflare' && recording.cloudflareKey) {
      await deleteFileFromCloudflareR2(recording.cloudflareKey);
    }

    await recording.deleteOne();
    res.json({ success: true, message: 'Recording deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
