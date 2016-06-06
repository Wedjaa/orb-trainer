var fs = require('fs');
var path = require('path');
var OrbIndexer = require('node-orbidx');

var orbIndexer = new OrbIndexer({
  nfeatures: 2000,
  maxKeypoints: 2000,
  nlevels: 100,
  gridRows: 1,
  gridCols: 1,
  minFeatureDistance: 10
});

orbIndexer.startTraining();

function trainImage(imageFile, cb) {
  orbIndexer.trainImageFile(imageFile)
    .then(function (response) {
      cb(undefined, response);
    })
    .catch(function (err) {
      cb(err);
    });
}

function done() {
  fs.stat('trained-words.dat', (err, stats) => {
    if (err && err.code === 'ENOENT') {
      console.log('Saving to ', 'trained-words.dat');
    } else {
      console.log('Removing existing trained-words.dat!')
      fs.unlinkSync('trained-words.dat');
    }
    orbIndexer.saveTrainedIndex('trained-words.dat')
      .then(function () {
        console.log('Done training - words db saved in: trained-words.dat');
      })
      .catch(function (err) {
        console.log('Saving training file failed: ', err);
      });
  });

}

function isImageFile(filepath) {
  if (filepath.indexOf('.') < 0) {
    return false;
  }
  var extension = filepath.split('.').pop();
  switch (extension.toLowerCase()) {
  case 'tiff', 'tif':
    return true;
  case 'jpeg', 'jpg':
    return true;
  case 'png':
    return true;
  default:
    return false;
  }
}

function trainFromPath(files, fileIdx, cb) {
  var imagePath = files[fileIdx];
  console.log('Training with images from ' + imagePath);
  fs.stat(imagePath, (err, stats) => {

    if (err) {
      console.log('Error: ' + err.message);
      return cb(err, fileIdx + 1);
    }

    if (stats.isDirectory()) {
      fs.readdir(imagePath, (err, files) => {
        var pathImages = files.length;
        files.map((filename, idx) => {
          var fullPath = path.resolve(path.join(imagePath, filename));
          console.log('Checking: [' + idx + '] ' + fullPath);
          if (isImageFile(fullPath)) {
            trainImage(fullPath, function (err, result) {
              console.log('Training: [' + idx + '] ' + result);
              pathImages--;
              if (pathImages === 0) {
                console.log('Directory completed!')
                cb(undefined, fileIdx + 1);
              }
            });
          } else {
            pathImages--;
            if (pathImages === 0) {
              console.log('Directory completed!')
              cb(undefined, fileIdx + 1);
            }
          }
        });
      });
    } else {
      console.log('Checking: ' + imagePath);
      if (isImageFile(imagePath)) {
        console.log('Training: ' + imagePath);
        trainImage(imagePath, function (err, result) {
          cb(undefined, fileIdx + 1);
        });
      } else {
        cb(undefined, fileIdx + 1);
      }
    }
  });

}

if (process.argv.length <= 2) {
  console.log('Usage: \n\tnode index.js <file|dir>|<file|dir>|..\n');
  return;
}

var onceDone = function (err, next) {
  if (err) {
    console.log('Error: ', err);
  }

  if (next == process.argv.length) {
    console.log('Saving training file');
    return done();
  }

  trainFromPath(process.argv, next, onceDone);
}

trainFromPath(process.argv, 2, onceDone);
