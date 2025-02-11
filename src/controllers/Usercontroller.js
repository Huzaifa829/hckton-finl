import express from 'express';
import { Usermodle } from '../Models/User.model.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import sendMail from '../utils/email-send.js';

// export const Signup = async (req, res) => {
//   try {
//     const { name, email, password } = req.body;

//     if (!name || !email || !password) {
//       return res.status(400).json({
//         message: "Please fill all required fields (name, email, password).",
//       });
//     }

//     if (!req.file) {
//       return res.status(400).json({ message: "Please upload a profile image." });
//     }

//     const existingUser = await Usermodle.findOne({ email });
//     if (existingUser) {
//       return res.status(400).json({ message: "User with this email already exists." });
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);
//     const profileImage = req.file.path;

//     const newUser = await Usermodle.create({
//       name,
//       email,
//       password: hashedPassword,
//       profileImage,
//     });

//     const payload = { user: { id: newUser._id } };
//     const token = jwt.sign(payload, process.env.JWT_SECRET_KEY || "defaultsecret", { expiresIn: "1h" });

//     newUser.token = token;
//     await newUser.save();

//     res.status(201).json({
//       message: "User signup successful",
//       user: {
//         id: newUser._id,
//         name: newUser.name,
//         email: newUser.email,
//         profileImage: newUser.profileImage,
//         token: newUser.token,
//       },
//     });
//   } catch (error) {
//     console.error("Signup controller error:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };
export const Signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check for required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Please fill all required fields (name, email, password).',
      });
    }
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ message: 'Invalid email format.' });
    }
  

    // Check if the user already exists
    const existingUser = await Usermodle.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: 'User with this email already exists.' });
    }

    // Encrypt the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save the user in the database
    const newUser = await Usermodle.create({
      name,
      email,
      password: hashedPassword,
    });

    // Generate JWT token
    const payload = { user: { id: newUser._id } };
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET_KEY || 'defaultsecret',
      { expiresIn: '1h' },
    );

    // // Save token to the user
    // newUser.token = token;
    // await newUser.save();

    res.cookie('acess_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });

    // const mailResponse = await sendMail({
    //   email: [email],
    //   subject: 'Welcome to Our Platform!',
    //   htmlTemplate:  `
    //   <h1>Welcome, ${name}!</h1>
    //   <p>Thank you for signing up. We're excited to have you on board!</p>
    //   <p>If you have any questions, feel free to contact us at support@example.com.</p>
    // `,
    // });
    // if (!mailResponse) {
    //   return res
    //     .status(500)
    //     .json({
    //       message: 'Failed to message, please try later',
    //       status: 'failed',
    //     });
    // }

    // Respond with success
    res.status(201).json({
      message: 'User signup successful and welcome email sent',
      user: newUser,
      token:token
    });
  } catch (error) {
    console.error('Signup controller error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const Login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please Fill All the fields' });
    }

    const user = await Usermodle.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User Not Found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect Password' });
    }

    const payload = { user: { id: user._id } };
    const token = jwt.sign(payload, "huz", {
      expiresIn: '1h',
    });

    user.token = token;
    await user.save();

    res.json({ message: 'Login Successful', user });
  } catch (error) {
    console.log(`Login controller has errors: ${error}`);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ message: 'All fields are required', status: 'failed' });
    }

    const user = await Usermodle.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ message: 'User not found', status: 'failed' });
    }

    const otp = Math.floor(Math.random() * 900000 + 100000);

    const mailResponse = await sendMail({
      email: [email],
      subject: 'OTP Verification Code',
      htmlTemplate: `<h1>OTP: ${otp}</h1>`,
    });

    if (!mailResponse) {
      return res
        .status(500)
        .json({
          message: 'Failed to send otp, please try later',
          status: 'failed',
        });
    }

    user.otp = {
      value: otp.toString(),
      expireAt: new Date(Date.now() + 1000 * 60 * 10),
      verified: false,
    };

    await user.save();
    res
      .status(200)
      .json({ message: 'OTP Sent Successfully', status: 'success' });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Internal Server Error', status: 'failed' });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res
        .status(400)
        .json({ message: 'All fields are required', status: 'failed' });
    }

    const user = await Usermodle.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ message: 'User not found', status: 'failed' });
    }

    if (user.otp.value !== otp.toString()) {
      return res.status(400).json({ message: 'Invalid OTP', status: 'failed' });
    }

    const currentTime = new Date();
    if (user.otp.expireAt < currentTime) {
      return res
        .status(400)
        .json({ message: 'OTP is expired', status: 'failed' });
    }

    user.otp.verified = true;
    await user.save();
    res
      .status(200)
      .json({ message: 'OTP Verified Successfully', status: 'success' });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Internal Server Error', status: 'failed' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'All fields are required', status: 'failed' });
    }

    const user = await Usermodle.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ message: 'User not found', status: 'failed' });
    }

    if (!user.otp.verified) {
      return res
        .status(400)
        .json({
          message: 'OTP Authentication failed, you are not verified user',
          status: 'failed',
        });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    user.password = hashedPassword;
    user.otp.verified = false;

    const payload = { user: { id: user._id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET_KEY, {
      expiresIn: '1y',
    });

    await user.save();

    res.status(200).json({
      message: 'Password Reset Successful',
      token,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Internal Server Error', status: 'failed' });
  }
};
