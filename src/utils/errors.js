export function extractError(err) {
  if (!err) return "Something went wrong";
  if (typeof err.detail === "string") return err.detail;
  if (Array.isArray(err.detail)) return err.detail.map((e) => e.msg).join(", ");
  if (typeof err === "string") return err;
  return "Something went wrong";
}
