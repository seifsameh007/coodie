const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const Project = require('../models/Project');

// Multer config for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '..', 'uploads', req.params.id || 'temp');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB max
});

// GET /api/projects — list all projects for user
router.get('/', auth, async (req, res) => {
    try {
        const projects = await Project.find({ userId: req.user.id })
            .select('name startDate deadline deadlineType type completionPercent createdAt')
            .sort({ createdAt: -1 });
        res.json({ projects });
    } catch (error) {
        console.error('Get projects error:', error);
        res.status(500).json({ error: 'Failed to load projects' });
    }
});

// POST /api/projects — create a new project
router.post('/', auth, async (req, res) => {
    try {
        const { name, startDate, deadline, deadlineType, type } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Project name is required' });
        }

        const project = new Project({
            userId: req.user.id,
            name: name.trim(),
            startDate: startDate || new Date(),
            deadline: deadlineType === 'open' ? null : deadline,
            deadlineType: deadlineType || 'open',
            type: type || 'personal'
        });

        await project.save();
        res.status(201).json({ message: 'Project created successfully', project });
    } catch (error) {
        console.error('Create project error:', error);
        res.status(500).json({ error: 'Failed to create project' });
    }
});

// GET /api/projects/:id — get single project
router.get('/:id', auth, async (req, res) => {
    try {
        const project = await Project.findOne({ _id: req.params.id, userId: req.user.id });
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        res.json({ project });
    } catch (error) {
        console.error('Get project error:', error);
        res.status(500).json({ error: 'Failed to load project' });
    }
});

// PUT /api/projects/:id — update project
router.put('/:id', auth, async (req, res) => {
    try {
        const project = await Project.findOne({ _id: req.params.id, userId: req.user.id });
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const allowedFields = ['name', 'startDate', 'deadline', 'deadlineType', 'type', 'script', 'notes', 'completionPercent'];
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                if (field === 'deadline' && req.body.deadlineType === 'open') {
                    project[field] = null;
                } else {
                    project[field] = req.body[field];
                }
            }
        });

        await project.save();
        res.json({ message: 'Project updated successfully', project });
    } catch (error) {
        console.error('Update project error:', error);
        res.status(500).json({ error: 'Failed to update project' });
    }
});

// DELETE /api/projects/:id — delete project
router.delete('/:id', auth, async (req, res) => {
    try {
        const project = await Project.findOne({ _id: req.params.id, userId: req.user.id });
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Delete uploaded files
        const uploadDir = path.join(__dirname, '..', 'uploads', req.params.id);
        if (fs.existsSync(uploadDir)) {
            fs.rmSync(uploadDir, { recursive: true, force: true });
        }

        await Project.deleteOne({ _id: req.params.id });
        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        console.error('Delete project error:', error);
        res.status(500).json({ error: 'Failed to delete project' });
    }
});

// POST /api/projects/:id/files — upload files
router.post('/:id/files', auth, upload.array('files', 10), async (req, res) => {
    try {
        const project = await Project.findOne({ _id: req.params.id, userId: req.user.id });
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const newFiles = req.files.map(file => ({
            originalName: file.originalname,
            fileName: file.filename,
            path: file.path,
            size: file.size
        }));

        project.files.push(...newFiles);
        await project.save();

        res.json({ message: 'Files uploaded successfully', files: project.files });
    } catch (error) {
        console.error('Upload files error:', error);
        res.status(500).json({ error: 'Failed to upload files' });
    }
});

// GET /api/projects/:id/files/:fileId — download a file
router.get('/:id/files/:fileId', auth, async (req, res) => {
    try {
        const project = await Project.findOne({ _id: req.params.id, userId: req.user.id });
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const file = project.files.id(req.params.fileId);
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        const filePath = path.join(__dirname, '..', 'uploads', req.params.id, file.fileName);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found on server' });
        }

        res.download(filePath, file.originalName);
    } catch (error) {
        console.error('Download file error:', error);
        res.status(500).json({ error: 'Failed to download file' });
    }
});

// DELETE /api/projects/:id/files/:fileId — delete a file
router.delete('/:id/files/:fileId', auth, async (req, res) => {
    try {
        const project = await Project.findOne({ _id: req.params.id, userId: req.user.id });
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const file = project.files.id(req.params.fileId);
        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Delete physical file
        const filePath = path.join(__dirname, '..', 'uploads', req.params.id, file.fileName);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Remove from array
        project.files.pull(req.params.fileId);
        await project.save();

        res.json({ message: 'File deleted successfully', files: project.files });
    } catch (error) {
        console.error('Delete file error:', error);
        res.status(500).json({ error: 'Failed to delete file' });
    }
});

module.exports = router;
