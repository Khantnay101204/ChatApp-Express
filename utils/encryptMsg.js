const crypto = require("crypto");
exports.encryptMsg = async (text) => {
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(
    process.env.MSG_ALG,
    Buffer.from(process.env.ENCRYPTION_KEY),
    iv
  );

  let encrypted = cipher.update(text, "utf8", "hex");

  encrypted += cipher.final("hex");

  return { iv: iv.toString("hex"), encryptedMsg: encrypted };
};
