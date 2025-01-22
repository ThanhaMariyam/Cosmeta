const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'cosmeta',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }],
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    console.log(file)
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
        console.log("ekodlgjfsnknf")
      cb(new Error('Not an image! Please upload an image.'), false);
    }
  },
});

const uploadFields = (req, res)=> {
    
    console.log( req.file);
    console.log('Body:', req.body);

    res.status(200).json({ message: 'Upload successful!' });
  }


module.exports = {
  upload,
  uploadFields,
};
