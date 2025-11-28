const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const uploadDir = path.join(__dirname, '../public/images');
const dataDir = path.join(__dirname, '../data');
const articlesFile = path.join(dataDir, 'articles.json');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(articlesFile)) {
    fs.writeFileSync(articlesFile, '[]');
}

function getArticles() {
    try {
        return JSON.parse(fs.readFileSync(articlesFile, 'utf8'));
    } catch {
        return [];
    }
}

function saveArticles(articles) {
    fs.writeFileSync(articlesFile, JSON.stringify(articles, null, 2));
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

// Articles API
app.get('/api/articles', (req, res) => {
    const articles = getArticles();
    res.json(articles.sort((a, b) => new Date(b.date) - new Date(a.date)));
});

app.post('/api/articles', upload.single('image'), (req, res) => {
    const { title, text } = req.body;
    if (!title || !text) {
        return res.status(400).json({ error: 'Title and text are required' });
    }
    
    const articles = getArticles();
    const newArticle = {
        id: Date.now().toString(),
        title,
        text,
        image: req.file ? `/images/${req.file.filename}` : null,
        date: new Date().toISOString()
    };
    
    articles.push(newArticle);
    saveArticles(articles);
    res.json({ success: true, article: newArticle });
});

app.delete('/api/articles/:id', (req, res) => {
    let articles = getArticles();
    const article = articles.find(a => a.id === req.params.id);
    if (!article) {
        return res.status(404).json({ error: 'Article not found' });
    }
    
    articles = articles.filter(a => a.id !== req.params.id);
    saveArticles(articles);
    res.json({ success: true });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Admin panel at http://localhost:${PORT}/admin/`);
});
