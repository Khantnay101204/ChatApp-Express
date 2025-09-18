const crypto = require("crypto");
exports.decryptMsg = async (hash) => {
  console.log(hash.id);

  const iv = Buffer.from(hash.iv, "hex");

  const decipher = crypto.createDecipheriv(
    process.env.MSG_ALG,
    Buffer.from(process.env.ENCRYPTION_KEY),
    iv
  );

  let decryptedMessage = decipher.update(hash.encryptedMsg, "hex", "utf8");

  decryptedMessage += decipher.final("utf8");

  return decryptedMessage;
};
