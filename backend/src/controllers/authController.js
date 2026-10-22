const { getDb } = require('../config/firebase');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-compliance-key';

exports.register = async (req, res) => {
  try {
    const db = getDb();
    if (!db) {
      return res.status(500).json({ success: false, error: 'Database not initialized' });
    }

    const { email, password, role, ...otherDetails } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ success: false, error: 'Email, password, and role are required' });
    }

    // Check if user exists
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email.toLowerCase()).get();

    if (!snapshot.empty) {
      return res.status(400).json({ success: false, error: 'Email is already registered. Please login.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save to Firestore
    const newUser = {
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role.toLowerCase(),
      ...otherDetails,
      createdAt: new Date().toISOString()
    };

    const docRef = await usersRef.add(newUser);

    // Generate JWT
    const token = jwt.sign({ id: docRef.id, email: newUser.email, role: newUser.role }, JWT_SECRET, { expiresIn: '1d' });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: docRef.id,
        email: newUser.email,
        role: newUser.role,
        name: newUser.fullName || newUser.contactPerson || newUser.companyName || ''
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: 'Internal server error during registration' });
  }
};

exports.login = async (req, res) => {
  try {
    const db = getDb();
    if (!db) {
      return res.status(500).json({ success: false, error: 'Database not initialized' });
    }

    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ success: false, error: 'Email, password, and requested portal role are required' });
    }

    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email.toLowerCase()).get();

    if (snapshot.empty) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    // Verify password
    const isMatch = await bcrypt.compare(password, userData.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    // Verify Role
    if (userData.role.toLowerCase() !== role.toLowerCase()) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid email or password' 
      });
    }

    // Generate JWT
    const token = jwt.sign({ id: userDoc.id, email: userData.email, role: userData.role }, JWT_SECRET, { expiresIn: '1d' });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: userDoc.id,
        email: userData.email,
        role: userData.role,
        name: userData.fullName || userData.contactPerson || userData.companyName || ''
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Internal server error during login' });
  }
};
