const Settings = require('../models/Settings');

// GET /api/settings — public (brand shown on login + app chrome)
exports.get = async (req, res) => {
  const s = await Settings.get();
  res.json({ settings: s });
};

// PATCH /api/settings — admin
exports.update = async (req, res) => {
  const { brandName, logo, primaryColor, slaHours } = req.body;
  const s = await Settings.get();

  if (typeof brandName === 'string' && brandName.trim()) s.brandName = brandName.trim();
  if (typeof primaryColor === 'string') s.primaryColor = primaryColor;
  if (typeof logo === 'string') {
    // logo is a data URL. Guard against oversized uploads (~350 KB base64).
    if (logo && logo.length > 350000) {
      return res.status(413).json({ message: 'Logo too large — please use an image under ~250 KB' });
    }
    s.logo = logo;
  }
  if (slaHours && typeof slaHours === 'object') {
    for (const key of ['urgent', 'high', 'medium', 'low']) {
      if (typeof slaHours[key] === 'number' && slaHours[key] > 0) s.slaHours[key] = slaHours[key];
    }
  }
  await s.save();
  res.json({ settings: s });
};
