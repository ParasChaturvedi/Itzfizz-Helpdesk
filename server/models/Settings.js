const mongoose = require('mongoose');

// A single settings document (id: "app") holding brand + SLA config.
const settingsSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'app' },
    brandName: { type: String, default: 'Itzfizz Helpdesk' },
    // Company logo stored as a data URL (base64) so it survives serverless
    // deploys without external file storage. Keep it small (< ~200 KB).
    logo: { type: String, default: '' },
    primaryColor: { type: String, default: '#d45427' },
    // Resolution SLA in hours, per priority.
    slaHours: {
      urgent: { type: Number, default: 4 },
      high: { type: Number, default: 8 },
      medium: { type: Number, default: 24 },
      low: { type: Number, default: 72 },
    },
  },
  { timestamps: true, _id: false }
);

settingsSchema.statics.get = async function () {
  let doc = await this.findById('app');
  if (!doc) doc = await this.create({ _id: 'app' });
  return doc;
};

module.exports = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);
