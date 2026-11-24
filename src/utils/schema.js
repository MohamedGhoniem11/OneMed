const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const fail = (msg) => {
  throw Object.assign(new Error(msg), { status: 400 });
};

function clean(def, value, path) {
  switch (def.type) {
    case "string": {
      if (typeof value !== "string") fail(`${path} must be a string`);
      let v = value.trim();
      if (def.transform) v = def.transform(v);
      if (v === "") {
        if (def.required) fail(`${path} is required`);
        return v;
      }
      if (def.min !== undefined && v.length < def.min) fail(`${path} must be at least ${def.min} characters`);
      if (def.max !== undefined && v.length > def.max) fail(`${path} must be at most ${def.max} characters`);
      if (def.enum && !def.enum.includes(v)) fail(`${path} must be one of: ${def.enum.join(", ")}`);
      if (def.pattern && !def.pattern.test(v)) fail(def.message || `${path} is invalid`);
      return v;
    }
    case "number": {
      if (typeof value !== "number" || Number.isNaN(value)) fail(`${path} must be a number`);
      if (def.min !== undefined && value < def.min) fail(`${path} must be >= ${def.min}`);
      if (def.max !== undefined && value > def.max) fail(`${path} must be <= ${def.max}`);
      return value;
    }
    case "boolean": {
      if (typeof value !== "boolean") fail(`${path} must be true or false`);
      return value;
    }
    case "array": {
      if (!Array.isArray(value)) fail(`${path} must be an array`);
      if (def.min !== undefined && value.length < def.min) fail(`${path} needs at least ${def.min} item(s)`);
      if (def.max !== undefined && value.length > def.max) fail(`${path} allows at most ${def.max} item(s)`);
      return value.map((item, i) => clean(def.of, item, `${path}[${i}]`));
    }
    case "object": {
      const result = shape(def.fields, value, path, false);
      if (def.additional) {
        for (const [key, item] of Object.entries(value)) {
          if (!(key in def.fields) && item !== undefined) result[key] = item;
        }
      }
      return result;
    }
    case "any":
      return value;
    default:
      return value;
  }
}

function shape(fields, data, path, partial) {
  if (!isObj(data)) fail(`${path || "body"} must be an object`);
  const out = {};
  for (const [key, def] of Object.entries(fields)) {
    if (def.readOnly) continue; // server-owned field
    const full = path ? `${path}.${key}` : key;
    const value = data[key];
    if (value === undefined || value === null) {
      if (!partial && def.required) fail(`${full} is required`);
      continue;
    }
    out[key] = clean(def, value, full);
  }
  return out;
}

// partial: true  => للتعديل (PATCH)، مفيش حقل إجباري
// partial: false => للإنشاء، الحقول required لازم تتبعت
export function validate(schema, data, { partial = false } = {}) {
  return shape(schema.fields, data, "", partial);
}