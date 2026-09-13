const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const ALLOWED_EXT = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const imageFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeOk = ALLOWED_MIME.includes(file.mimetype);
  const extOk  = ALLOWED_EXT.includes(ext);
  if (mimeOk && extOk) cb(null, true);
  else cb(new Error("Only JPG, PNG, WEBP, or GIF images are allowed"), false);
};

const upload = multer({ storage, fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } });

module.exports = { upload };
