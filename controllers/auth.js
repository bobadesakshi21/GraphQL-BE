/* eslint-disable no-unused-vars */

const User = require('../models/user')
const { validationResult } = require('express-validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

exports.signup = async (req, res, next) => {

  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    const error = new Error('Validation Failed')
    error.statusCode = 422
    error.data = errors.array()
    throw error
  }

  const email = req.body.email
  const name = req.body.name
  const password = req.body.password

  try {
    const hashedPassword = await bcrypt.hash(password, 12)
    const user = new User({
      email: email,
      password: hashedPassword,
      name: name
    })
    const result = user.save()
    res.status(201).json({
      message: 'New user is created',
      userId: result._id
    })

  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500
    }
    next(err)
  }
}

exports.login = async (req, res, next) => {
  const email = req.body.email
  const password = req.body.password

  let loadedUser

  try {
    const user = await User.findOne({ email: email })
    if (!user) {
      const err = new Error('User Not Found')
      err.statusCode = 401
      throw err
    }
    loadedUser = user
    const isEqual = await bcrypt.compare(password, user.password)
    if (!isEqual) {
      const error = new Error('Wrong Password')
      error.statusCode = 401
      throw error
    }
    const token = jwt.sign({
      email: loadedUser.email,
      userId: loadedUser._id.toString(),
    },
    'secret',
    { expiresIn: '1h' }
    )
    return res.status(200).json({
      token: token,
      userId: loadedUser._id.toString()
    })
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500
    }
    next(err)
  }
}

exports.getUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId)
    if (!user) {
      const error = new Error('User Not Found')
      error.statusCode = 404
      throw error
    }
    return res.status(200).json({
      status: user.status
    })
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500
    }
    next(err)
  }
}

exports.updateUserStatus = async (req, res, next) => {
  const newStatus = req.body.status
  try {
    const user = await User.findById(req.userId)
    if (!user) {
      const err = new Error('User Not Found')
      err.statusCode = 401
      throw err
    }
    user.status = newStatus
    await user.save()
    return res.status(200).json({
      message: 'User Updated'
    })
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500
    }
    next(err)
  }
}