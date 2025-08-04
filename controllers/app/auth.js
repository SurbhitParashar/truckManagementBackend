// src/controllers/authController.js
import bcrypt from 'bcrypt';
import { findDriverByUsername } from '../../db/app/auth.js';
import { setUser } from '../../service/auth.js';

export async function login(req, res) {
  const { username, password } = req.body;

  try {
    // 1) Fetch driver
    const driver = await findDriverByUsername(username);
    if (!driver) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 2) Compare password
    const isMatch = await bcrypt.compare(password, driver.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 3) Sign token
    const token = setUser({ id: driver.id, username: driver.username });

    // 4) Send response
    res.json({
      token,
      user: {
        id: driver.id,
        username: driver.username
      }
    });

  } catch (err) {
    console.error('❌ [authController.login]', err);
    res.status(500).json({ message: 'Server error' });
  }
}
