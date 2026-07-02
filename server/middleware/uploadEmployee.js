const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Base uploads dir: server/uploads
const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');

const DIRS = {
  profiles: path.join(UPLOAD_ROOT, 'profiles'),
  certificates: path.join(UPLOAD_ROOT, 'orginal_certificate'), // kept spelling to match old file paths already stored in DB
  bulk: path.join(UPLOAD_ROOT, 'bulk_uploads'),
  downloads: path.join(UPLOAD_ROOT, 'downloads'),
};

Object.values(DIRS).forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

function makeStorage(subDir) {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, subDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, unique + ext);
    },
  });
}

// Used on add/update employee: profile_image + cert_file_0
const employeeUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      if (file.fieldname === 'profile_image') return cb(null, DIRS.profiles);
      if (file.fieldname === 'cert_file_0') return cb(null, DIRS.certificates);
      cb(null, UPLOAD_ROOT);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, unique + ext);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'profile_image' || file.fieldname === 'cert_file_0') {
      const allowed = /jpeg|jpg|png/;
      const ok = allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype);
      if (!ok) return cb(new Error('Only JPG/PNG images are allowed'));
    }
    cb(null, true);
  },
}).fields([
  { name: 'profile_image', maxCount: 1 },
  { name: 'cert_file_0', maxCount: 1 },
]);

// Used for bulk deduction upload (xlsx/xls/csv)
const bulkUpload = multer({
  storage: makeStorage(DIRS.bulk),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /xlsx|xls|csv/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase());
    if (!ok) return cb(new Error('Please upload an Excel/CSV file'));
    cb(null, true);
  },
}).single('excel_file');

module.exports = { employeeUpload, bulkUpload, DIRS, UPLOAD_ROOT };