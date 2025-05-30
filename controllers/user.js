import * as UserDB from '../db/userQueries.js';
import { setUser } from '../service/auth.js'


export async function handleUserLogin(req, res) {
  const { username, password } = req.body;

  const isValid = await UserDB.validateUseronLogin(username, password);

  console.log(username, password)
  console.log(isValid)

  if (isValid) {
    const token = setUser({ username });
    res.cookie("uid", token, {
      httpOnly: true,
      sameSite: "Lax",
      secure: false // for localhost
    })

    // console.log(token)

    return res.status(200).json({ success: true, message: 'Login successful' });
  } else {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
}
