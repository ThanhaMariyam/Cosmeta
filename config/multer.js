const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'cosmeta',
    allowed_formats: ['jpg', 'jpeg', 'png']
  },
  });
 

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    console.log(file)
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload an image.'), false);
    }
  },
});




module.exports = {
  upload
};
