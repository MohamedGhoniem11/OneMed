import multer from "multer";
import { httpError } from "../services/user.service.js";

const ALLOWED = /^image\/(png|jpe?g|webp|bmp|tiff?)$/i;

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED.test(file.mimetype)) {
      return cb(httpError(400, "only image uploads are allowed (png/jpg/webp/bmp/tiff)"));
    }
    cb(null, true);
  },
});
