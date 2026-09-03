import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';

function generateToken(id) {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'nsk_esports_super_secret_jwt_key_2026',
    { expiresIn: '30d' }
  );
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() });

    if (!admin || !(await admin.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const token = generateToken(admin._id);

    res.json({
      success: true,
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req, res, next) {
  try {
    res.json({
      success: true,
      admin: {
        id: req.admin._id,
        email: req.admin.email,
        name: req.admin.name,
        role: req.admin.role
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function seedAdmin(req, res, next) {
  try {
    const adminCount = await Admin.countDocuments();
    if (adminCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Admin account already initialized'
      });
    }

    const defaultEmail = (process.env.DEFAULT_ADMIN_EMAIL || 'admin@nsk-esports.in').toLowerCase();
    const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@12345';

    const admin = await Admin.create({
      email: defaultEmail,
      password: defaultPassword,
      name: 'Super Admin',
      role: 'admin'
    });

    const token = generateToken(admin._id);

    res.status(201).json({
      success: true,
      message: 'Initial admin created successfully',
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });
  } catch (err) {
    next(err);
  }
}
