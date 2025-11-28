const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const uploadDir = path.join(__dirname, '../public/images');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const name = `work-${Date.now()}${ext}`;
        cb(null, name);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp|tiff|tif/;
        const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        if (ext) {
            cb(null, true);
        } else {
            cb(new Error('Only images allowed (jpg, png, webp, tiff)'));
        }
    }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Admin panel route
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../admin/index.html'));
});
app.use('/admin', express.static(path.join(__dirname, '../admin')));

app.get('/api/images', (req, res) => {
    fs.readdir(uploadDir, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read images' });
        }
        const images = files
            .filter(f => /\.(jpg|jpeg|png|webp|tiff|tif)$/i.test(f))
            .map(f => ({
                name: f,
                url: `/images/${f}`,
                path: path.join(uploadDir, f)
            }));
        res.json(images);
    });
});

app.post('/api/upload', upload.array('images', 10), (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
    }
    const uploaded = req.files.map(f => ({
        name: f.filename,
        url: `/images/${f.filename}`
    }));
    res.json({ success: true, images: uploaded });
});

app.delete('/api/images/:name', (req, res) => {
    const filePath = path.join(uploadDir, req.params.name);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Image not found' });
    }
    fs.unlink(filePath, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to delete image' });
        }
        res.json({ success: true });
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Admin panel at http://localhost:${PORT}/admin/`);
});
