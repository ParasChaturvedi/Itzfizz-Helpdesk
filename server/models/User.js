const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Access is derived from role: admin = full, client = own tickets only,
// everything else = staff (can handle/assign tickets).
const ROLES = ['admin', 'developer', 'designer', 'content_writer', 'hr', 'agent', 'client'];
const STAFF_ROLES = ['admin', 'developer', 'designer', 'content_writer', 'hr', 'agent'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // Optional login handle set by the admin. User can log in with email OR username.
    username: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ROLES, default: 'client' },
    // Team / department (e.g. "Design", "Development") — used for routing.
    department: { type: String, default: '' },

    // Notification channels.
    phone: { type: String, default: '' }, // WhatsApp number incl. country code, e.g. +9198...
    whatsappApiKey: { type: String, default: '' }, // optional CallMeBot key (free WhatsApp)

    avatarColor: { type: String, default: '#6366f1' },
    active: { type: Boolean, default: true },
    // Set when an admin provisions the account; user should change it later.
    mustChangePassword: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.virtual('isStaff').get(function () {
  return STAFF_ROLES.includes(this.role);
});

userSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    delete ret.password;
    delete ret.whatsappApiKey; // never expose secrets to the client
    return ret;
  },
});

const User = mongoose.models.User || mongoose.model('User', userSchema);
User.ROLES = ROLES;
User.STAFF_ROLES = STAFF_ROLES;
module.exports = User;
