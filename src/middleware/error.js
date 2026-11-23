export const notFound = (req, res) =>
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });

export function errorHandler(err, req, res, next) {
  const status =
    Number.isInteger(err.status) && err.status >= 400 && err.status < 600
      ? err.status
      : 500;

  if (status >= 500) console.error(err); // الأخطاء الحقيقية تظهر في الـ terminal

  res.status(status).json({ message: err.message || "Internal Server Error" });
}