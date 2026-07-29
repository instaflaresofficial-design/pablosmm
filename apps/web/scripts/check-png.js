const fs = require('fs');

function readPNGDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  // PNG signature: 89 50 4e 47 0d 0a 1a 0a
  if (buffer.toString('hex', 0, 8) !== '89504e470d0a1a0a') {
    console.log('Not a PNG');
    return;
  }
  // IHDR chunk starts at byte 12
  // Width is 4 bytes at byte 16, Height is 4 bytes at byte 20
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  console.log(`Dimensions: ${width}x${height}`);
}

readPNGDimensions('d:\\Works\\pablosmm\\apps\\web\\public\\logos\\logo.png');
