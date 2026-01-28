const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const iconsDir = path.join(__dirname, 'src', 'icons');

// ensure directory exists
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('Checking for icons in', iconsDir);

const sizes = [16, 48, 128];
const colors = {
    16: '#6366f1',
    48: '#4f46e5',
    128: '#4338ca'
};

// Simple SVG generator for icons
function generateSvg(size, color) {
    return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${color}" rx="${size / 4}" />
        <text x="50%" y="50%" font-family="Arial" font-size="${size / 2}" fill="white" text-anchor="middle" dy=".3em">P</text>
    </svg>`;
}

// Check if we have ImageMagick or something to convert? 
// Or just creating SVGs and asking user to convert/use them? 
// Chrome supports PNG. 
// Since we don't have a canvas library guaranteed, we'll just log instructions if files rely on external tools,
// or we can try to use a simple buffer generation if we want to be fancy, but that's overkill.
//
// Best approach: Check if icons exist. If not, create dummy files or log error.
// The user likely has them if they cloned the repo. 

let missing = false;
sizes.forEach(size => {
    const file = path.join(iconsDir, `icon${size}.png`);
    if (!fs.existsSync(file)) {
        console.log(`Missing icon${size}.png`);
        missing = true;
    } else {
        console.log(`Found icon${size}.png`);
    }
});

if (missing) {
    console.log('\n⚠️ Some icons are missing.');
    console.log('Please ensure you have icon16.png, icon48.png, and icon128.png in src/icons/');
    console.log('You can generate them using an external tool or design your own.');
} else {
    console.log('\n✅ All icons present.');
}
