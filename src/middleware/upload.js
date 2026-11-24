import multer from "multer";
import { env } from "../config/env.js";
import { httpError } from "../utils/http-error.js";

/**
 * Medical document upload guard (M2/R7/R8).
 * Accepts the formats named in the project document: PDF, JPG/PNG, CSV/JSON,
 * FHIR JSON and DICOM. Size is bounded by UPLOAD_MAX_MB (default 50MB).
 */
const IMAGE = /^image\/(png|jpe?g|webp|bmp|tiff?)$/i;
const EXTENSIONS = /\.(pdf|png|jpe?g|webp|bmp|tiff?|csv|json|fhir|dcm|dicom|txt)$/i;
const OTHER_MIME = /^(application\/(pdf|json|fhir\+json|dicom)|text\/(csv|plain))$/i;

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.uploadMaxBytes,
    files: 1,
    fields: 10,
  },
  fileFilter: (req, file, cb) => {
    const name = String(file.originalname || "");
    const allowed = IMAGE.test(file.mimetype) || OTHER_MIME.test(file.mimetype) || EXTENSIONS.test(name);
    if (!allowed) {
      return cb(httpError(400, "Unsupported file type. Use PDF, image, CSV, JSON/FHIR, DICOM or text."));
    }
    cb(null, true);
  },
});
