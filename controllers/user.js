import * as UserDB from '../db/userQueries.js';

export async function handleUserLogin(req, res) {
    const { username, password } = req.body;
    console.log(username, password);

    const isValid = await UserDB.validateUseronLogin(username, password);

    // if (isValid) {
    //     res.redirect("/ManageCompany");
    // } else {
    //     res.redirect("/");
    // }
    if (isValid) {
    return res.status(200).json({ success: true, message: 'Login successful' });
  } else {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
}
