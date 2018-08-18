const express = require("express");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const mailer = require("../../modules/mailer");

const authConfig = require("../../config/auth");

const User = require("../models/User");

const router = express.Router();

function generateToken(params = {}) {
  return jwt.sign({ params }, authConfig.secret, {
    expiresIn: 86400
  });
}

router.post("/register", async (req, res) => {
  const { email } = req.body;

  try {
    if (await User.findOne({ email: email.toLowerCase() })) {
      return res.status(400).json({
        error: "User already exists"
      });
    }

    const user = await User.create(req.body);

    user.password = undefined;

    return res.json({
      user,
      token: generateToken({ id: user._id })
    });
  } catch (error) {
    return res.status(400).json({
      error: "Registration failed"
    });
  }
});

router.post("/authenticate", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(400).json({
        error: "User not found"
      });
    }

    if (!(await bcryptjs.compare(password, user.password))) {
      return res.status(400).json({
        error: "Invalid password"
      });
    }

    user.password = undefined;

    return res.json({
      user,
      token: generateToken({ id: user._id })
    });
  } catch (error) {
    return res.status(400).json({
      error: "Failed on searching user"
    });
  }
});

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        error: "User not found"
      });
    }

    const token = crypto.randomBytes(20).toString("hex");

    const now = new Date();
    now.setHours(now.getHours() + 1);

    await User.findOneAndUpdate(
      { _id: user.id },
      {
        $set: {
          passwordResetToken: token,
          passwordResetExpires: now
        }
      }
    );

    mailer.sendMail(
      {
        to: email,
        from: "teste@teste.com",
        template: "auth/forgot_password",
        context: { token }
      },
      err => {
        /**
         * Here, we not validate if email send failed, to prevent "delay request"
         * But, if you want, just update the logic
         */
        if (err) {
          console.log("err ", err);
          /**
           * It's a good practice send a email of error for admin,
           * or just print in log a "error-list-file" for managers can see
           */
        }
      }
    );

    res.send();
  } catch (error) {
    res.status(400).json({
      error: "Error on forgot password, try again"
    });
  }
});

router.post("/reset-password", async (req, res) => {
  const { email, token, password } = req.body;

  try {
    const user = await User.findOne({ email }).select(
      "+passwordResetToken passwordResetExpires"
    );

    if (!user) {
      return res.status(400).json({
        error: "User not found"
      });
    }

    if (token !== user.passwordResetToken) {
      return res.status(400).json({
        error: "Token invalid"
      });
    }

    const now = new Date();

    if (now > user.passwordResetExpires) {
      return res.status(400).json({
        error: "Token expired, generate a new one"
      });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    res.send();
  } catch (error) {
    res.status(400).json({
      error: "Cannot reset password, try again"
    });
  }
});

module.exports = app => app.use("/auth", router);
