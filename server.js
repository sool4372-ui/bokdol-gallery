const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(uploadDir));

function safeBaseName(name) {
  return name.replace(/[^\w.-]+/g, "_");
}

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const base = safeBaseName(path.basename(file.originalname || "photo", ext));
    cb(null, `${Date.now()}_${base}${ext.toLowerCase()}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_, file, cb) => {
    const ok = /^image\/(png|jpeg|jpg|gif|webp)$/i.test(file.mimetype);
    cb(ok ? null : new Error("Only images allowed"), ok);
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

app.post("/upload", upload.single("photo"), (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, msg: "No file" });
  res.json({ ok: true });
});

app.get("/photos", (req, res) => {
  const files = fs
    .readdirSync(uploadDir)
    .filter((f) => /\.(png|jpe?g|gif|webp)$/i.test(f))
    .sort((a, b) => {
      const na = Number(a.split("_")[0]) || 0;
      const nb = Number(b.split("_")[0]) || 0;
      return nb - na;
    });

  const items = files.map((filename) => {
    const full = path.join(uploadDir, filename);
    const stat = fs.statSync(full);
    return {
      filename,
      url: `/uploads/${filename}`,
      uploadedAt: stat.mtimeMs,
    };
  });

  res.json(items);
});

app.delete("/photos/:filename", (req, res) => {
  const filename = req.params.filename;

  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return res.status(400).json({ ok: false, msg: "Bad filename" });
  }

  const full = path.join(uploadDir, filename);
  if (!fs.existsSync(full)) return res.status(404).json({ ok: false, msg: "Not found" });

  fs.unlinkSync(full);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`✅ Bokdol Gallery running: http://localhost:${PORT}`);
});
