const Tag = require('../models/Tag');

// GET /api/tags — everyone (needed to render/filter by tag)
exports.list = async (req, res) => {
  const tags = await Tag.find().sort('name').lean();
  res.json({ tags });
};

// POST /api/tags — staff
exports.create = async (req, res) => {
  const { name, color } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ message: 'A tag name is required' });
  const existing = await Tag.findOne({ name: name.trim() });
  if (existing) return res.status(409).json({ message: 'That tag already exists' });
  const tag = await Tag.create({
    name: name.trim(),
    color: color || '#64748b',
    createdBy: req.user._id,
  });
  res.status(201).json({ tag });
};

// DELETE /api/tags/:id — admin
exports.remove = async (req, res) => {
  const tag = await Tag.findByIdAndDelete(req.params.id);
  if (!tag) return res.status(404).json({ message: 'Tag not found' });
  res.json({ message: 'Tag deleted' });
};
