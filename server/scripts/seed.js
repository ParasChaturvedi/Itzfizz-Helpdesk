/**
 * Seed an admin + a couple of demo agents/clients and sample tickets.
 * Usage:  npm run seed
 * Set ADMIN_EMAIL / ADMIN_PASSWORD env vars to control the admin login.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Ticket = require('../models/Ticket');

async function run() {
  await connectDB();

  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@deskflow.local').toLowerCase();
  const adminPass = process.env.ADMIN_PASSWORD || 'admin123';

  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    admin = await User.create({
      name: 'Admin',
      email: adminEmail,
      password: adminPass,
      role: 'admin',
      department: 'General',
    });
    console.log(`✅ Admin created: ${adminEmail} / ${adminPass}`);
  } else {
    console.log(`ℹ️  Admin already exists: ${adminEmail}`);
  }

  const upsert = async (data) => {
    let u = await User.findOne({ email: data.email });
    if (!u) u = await User.create(data);
    return u;
  };

  const designer = await upsert({
    name: 'Priya (Design)', email: 'design@deskflow.local',
    password: 'agent123', role: 'agent', department: 'Design',
  });
  const dev = await upsert({
    name: 'Rahul (Dev)', email: 'dev@deskflow.local',
    password: 'agent123', role: 'agent', department: 'Development',
  });
  const client = await upsert({
    name: 'Sample Client', email: 'client@deskflow.local',
    password: 'client123', role: 'client',
  });

  const count = await Ticket.countDocuments();
  if (count === 0) {
    await Ticket.create({
      subject: 'Logo colors look off on mobile',
      priority: 'high', department: 'Design',
      requester: client._id, requesterEmail: client.email, requesterName: client.name,
      assignee: designer._id, estimatedTime: '1-2 days',
      messages: [{ author: client._id, authorName: client.name, authorEmail: client.email, authorType: 'client', body: 'On my phone the brand colors look faded. Can you check?' }],
      activity: [{ actorName: client.name, action: 'created the ticket' }],
    });
    await Ticket.create({
      subject: 'Contact form not sending emails',
      priority: 'urgent', department: 'Development', status: 'in_progress',
      requester: client._id, requesterEmail: client.email, requesterName: client.name,
      assignee: dev._id, estimatedTime: '4 hours',
      messages: [{ author: client._id, authorName: client.name, authorEmail: client.email, authorType: 'client', body: 'Submissions on the contact form never reach my inbox.' }],
      activity: [{ actorName: client.name, action: 'created the ticket' }],
    });
    console.log('✅ Sample tickets created');
  }

  console.log('\nDemo logins:');
  console.log(`  admin  → ${adminEmail} / ${adminPass}`);
  console.log('  agent  → design@deskflow.local / agent123');
  console.log('  agent  → dev@deskflow.local / agent123');
  console.log('  client → client@deskflow.local / client123');

  await mongoose.connection.close();
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
