/* eslint-disable space-before-function-paren */
/* eslint-disable no-unused-vars */
const path = require('path')

const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const multer = require('multer')
const { graphqlHTTP } = require('express-graphql')

const graphqlSchema = require('./graphql/schema')
const graphqlResolver = require('./graphql/resolvers')
const auth = require('./middleware/auth')
const { clearImage } = require('./util/file')

const MONGODB_URI = 'mongodb+srv://Sakshi:sakshibobade@cluster0.vpzlm.mongodb.net/messages?retryWrites=true&w=majority'

const app = express()

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images')
  },
  filename: (req, file, cb) => {
    cb(null, new Date().toISOString() + ' - ' + file.originalname)
  }
})

const fileFilter = (req, file, cb) => {
  if (
    file.mimeType === 'image/jpeg' ||
    file.mimeType === 'image/jpg' ||
    file.mimeType === 'image/png'
  ) {
    cb(null, true)
  } else {
    cb(null, false)
  }
}

// app.use(bodyParser.urlencoded({})) // x-www-form-urlencoded
app.use(bodyParser.json()) // application/json
app.use(multer({ storage: fileStorage, filter: fileFilter }).single('image'))

app.use('/images', express.static(path.join(__dirname, 'images')))

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})

app.use(auth)

app.put('/post-image', (req, res, next) => {
  if (!req.isAuth) {
    throw new Error('Not Authenticated')
  }
  if (!req.file) {
    return res.status(200).json({ message: 'No file provided!' })
  }
  if (req.body.oldPath) {
    clearImage(req.body.oldPath)
  }
  return res
    .status(201)
    .json({ message: 'File Stored', filePath: req.file.path })
})

app.use('/graphql', graphqlHTTP({
  schema: graphqlSchema,
  rootValue: graphqlResolver,
  graphiql: true,
  customFormatErrorFn(err) {
    if (!err.originalError) {
      return err
    }
    const data = err.originalError.data
    const message = err.message || 'An error occurred!'
    const code = err.originalError.code || 500
    return {
      message: message,
      status: code,
      data: data
    }
  }
}))

app.use((error, req, res, next) => {
  console.log(error)
  const statusCode = error.statusCode || 500
  const message = error.message
  const data = error.data
  res.status(statusCode).json({
    message: message,
    data: data
  })
})

mongoose.connect(MONGODB_URI)
  .then(() => {
    app.listen(8080)
  })
  .catch(err => {
    console.log('CONNECTION ERR', err)
  })
