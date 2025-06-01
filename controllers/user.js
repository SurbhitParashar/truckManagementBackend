import * as UserDB from '../db/userQueries.js';
import { setUser } from '../service/auth.js'


export async function handleUserLogin(req, res) {
  const { username, password } = req.body;

  // Validate credentials and fetch user record
  const user = await UserDB.getUserByUsername(username);
  const isValid = user && await UserDB.validateUseronLogin(username, password);

  if (isValid) {
    // Pass full user object including id
    const token = setUser({ id: user.id, username: user.username });

    res.cookie("uid", token, {
      httpOnly: true,
      sameSite: "Lax",
      secure: false, // for localhost
    });

    return res.status(200).json({ success: true, message: 'Login successful' });
  } else {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
}
