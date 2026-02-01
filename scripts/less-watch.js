const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const LESS_FILE = path.join(process.cwd(), 'app', 'style.less');
const CSS_FILE = path.join(process.cwd(), 'app', 'style.css');

console.log(`🚀 Starting LESS Watcher...`);
console.log(`👀 Watching: ${LESS_FILE}`);
console.log(`🎯 Output: ${CSS_FILE}`);

function compile() {
    console.log(`[${new Date().toLocaleTimeString()}] 🛠 Compiling LESS...`);
    exec(`npx less ${LESS_FILE} ${CSS_FILE}`, (err, stdout, stderr) => {
        if (err) {
            console.error(`❌ Compilation Error:`, stderr);
            return;
        }
        console.log(`✅ CSS Updated Successfully!`);
    });
}

// Initial compile
compile();

// Watch for changes
fs.watch(LESS_FILE, (event, filename) => {
    if (event === 'change') {
        compile();
    }
});
