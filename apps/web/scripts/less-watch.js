const fs = require('fs');
const path = require('path');
const less = require('less');

const LESS_FILE = path.join(process.cwd(), 'app', 'style.less');
const CSS_FILE = path.join(process.cwd(), 'app', 'style.css');

console.log(`🚀 Starting LESS Watcher...`);
console.log(`👀 Watching: ${LESS_FILE}`);
console.log(`🎯 Output: ${CSS_FILE}`);

function compile() {
    console.log(`[${new Date().toLocaleTimeString()}] 🛠 Compiling LESS...`);
    fs.readFile(LESS_FILE, 'utf8', (err, data) => {
        if (err) {
            console.error(`❌ Read Error:`, err);
            return;
        }
        less.render(data, { filename: path.resolve(LESS_FILE) })
            .then(output => {
                fs.writeFile(CSS_FILE, output.css, (err) => {
                    if (err) {
                        console.error(`❌ Write Error:`, err);
                        return;
                    }
                    console.log(`✅ CSS Updated Successfully!`);
                });
            })
            .catch(err => {
                console.error(`❌ Compilation Error:`, err);
            });
    });
}

// Initial compile
compile();

// Watch for changes
let timeout = null;
fs.watch(LESS_FILE, (event, filename) => {
    if (event === 'change') {
        clearTimeout(timeout);
        timeout = setTimeout(compile, 100);
    }
});
