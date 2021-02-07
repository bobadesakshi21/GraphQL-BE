const bcrypt = require('bcryptjs')
const validator = require('validator')
const jwt = require('jsonwebtoken')

const User = require('../models/user')
const Post = require('../models/user')

module.exports = {
  createUser: async function ({ userInput }, req) {
    // const email = args.userInput.email

    const errors = []
    if (!validator.isEmail(userInput.email)) {
      errors.push({ message: 'E-Mail is invalid' })
    }
    if (validator.isEmpty(userInput.password) ||
      !validator.isLength(userInput.password, { min: 5 })) {
      errors.push({ message: 'Password is too short.' })
    }
    if (errors.length > 0) {
      const error = new Error('Invalid Input')
      error.data = errors
      error.code = 422
      throw error
    }

    const existingUser = await User.findOne({ email: userInput.email })

    if (existingUser) {
      const error = new Error('User exists already!')
      throw error
    }
    const hashedPassword = await bcrypt.hash(userInput.password, 12)
    const user = new User({
      email: userInput.email,
      name: userInput.name,
      password: hashedPassword
    })

    const createdUser = await user.save()
    return { ...createdUser._doc, _id: createdUser._id.toString() }
  },
  login: async function ({ email, password }) {
    const user = await User.findOne({ email: email })
    if (!user) {
      const err = new Error('User doesnot exists')
      err.code = 401
      throw err
    }
    const isEqual = bcrypt.compare(password, user.password)
    if (!isEqual) {
      const err = new Error('Invalid Credentials')
      err.code = 401
      throw err
    }
    const token = jwt.sign({
      email: user.email,
      userId: user._id.toString()
    },
      'secret',
      { expiresIn: '1h' }
    )

    return { token: token, userId: user._id.toString() }
  },

  createPost: async function ({ postInput }, req) {
    if (!req.isAuth) {
      const err = new Error('Not Authenticated')
      err.code = 401
      throw err
    }

    const errors = []
    if (validator.isEmpty(postInput.title) ||
      !validator.isLength(postInput.title, { min: 3 })) {
      errors.push({ message: 'Title is invalid' })
    }
    if (validator.isEmpty(postInput.content) ||
      !validator.isLength(postInput.content, { min: 3 })) {
      errors.push({ message: 'Content is invalid' })
    }
    if (errors.length > 0) {
      const err = new Error('Invalid Input')
      err.code = 422
      err.data = errors
      throw err
    }

    const user = User.findById(req.userId)
    if (!user) {
      const err = new Error('Invalid User')
      err.code = 401
      err.data = errors
      throw err
    }

    const post = new Post({
      title: postInput.title,
      content: postInput.content,
      imageUrl: postInput.imageUrl,
      creator: user
    })

    const createdPost = await post.save()
    user.posts.push(createdPost)
    return {
      ...createdPost._doc,
      _id: createdPost._id.toString(),
      createdAt: createdPost.createdAt.toISOString(),
      updatedAt: createdPost.createdAt.toISOString()
    }
  }
}
