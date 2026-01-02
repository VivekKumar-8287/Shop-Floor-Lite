// middleware/uploadMiddleware.js
import multer from 'multer';
import path from 'path';

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Create this folder
  },
  filename: (req, file, cb) => {
    // Create unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `downtime-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// File filter - only accept images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif)'));
  }
};

// Compress and limit size to 200KB
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 200 * 1024, // 200KB
    files: 1 // Only one file
  }
});

// Middleware to compress image
const compressImage = (req, res, next) => {
  if (!req.file) return next();
  
  // In production, use sharp or jimp for compression
  // For now, we'll just check size
  const fileSizeInKB = Math.round(req.file.size / 1024);
  
  if (fileSizeInKB > 200) {
    return res.status(400).json({
      success: false,
      error: `Image size ${fileSizeInKB}KB exceeds 200KB limit`
    });
  }
  
  req.file.sizeInKB = fileSizeInKB;
  next();
};

export { upload, compressImage };