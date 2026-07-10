const mongoose = require('mongoose');

// Atomic auto-increment source for human-friendly ticket numbers (TKT-000123).
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

counterSchema.statics.next = async function (key) {
  const doc = await this.findByIdAndUpdate(
    key,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc.seq;
};

module.exports = mongoose.models.Counter || mongoose.model('Counter', counterSchema);
