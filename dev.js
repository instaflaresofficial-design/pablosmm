const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Custom Less Watcher and Next.js Dev Server...');

// generic function to compile less
function compileLess() {
    console.log('🎨 Compiling style.less...');
    // Using npx less directly to avoid path issues
    exec('npx less app/style.less app/style.css', (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ Less compilation error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`⚠️ Less compilation stderr: ${stderr}`);
            return;
        }
        console.log('✅ style.css updated!');
    });
}

// Watch the file directly using fs
const stylePath = path.join(__dirname, 'app', 'style.less');
let fsWait = false;
try {
    console.log(`👀 Watching: ${stylePath}`);
    // Initial compile
    compileLess();

    fs.watch(stylePath, (event, filename) => {
        if (filename) {
            if (fsWait) return;
            fsWait = setTimeout(() => {
                fsWait = false;
            }, 100); // Debounce
            compileLess();
        }
    });
} catch (err) {
    console.error(`❌ Failed to set up watcher: ${err.message}`);
}

// Start the Next.js Dev Server
const next = spawn('next', ['dev'], {
    stdio: 'inherit',
    shell: true
});

// Handle exit
next.on('close', (code) => {
    console.log(`Next.js server exited with code ${code}`);
    process.exit(code);
});
