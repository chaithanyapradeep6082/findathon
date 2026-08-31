const multer = require('multer');

// Files are held in memory only long enough to be encrypted and written
// to disk under a random storage key - the plaintext never touches disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 10 }, // 25MB/file, 10 files/package
});

module.exports = upload;
