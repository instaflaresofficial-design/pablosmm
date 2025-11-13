const fs = require('fs');
const path = require('path');

const platformKeywords = {
    instagram: ['instagram'],
    youtube: ['youtube'],
    telegram: ['telegram'],
    facebook: ['facebook'],
    tiktok: ['tiktok'],
    x: ['twitter', 'x', 'tweet'],
};

const categoryKeywords = [
    { key: 'followers', synonyms: ['follower', 'subscribers', 'members'] },
    { key: 'likes', synonyms: ['like', 'favorites', 'reaction'] },
    { key: 'comments', synonyms: ['comment', 'reply', 'reviews'] },
    { key: 'views', synonyms: ['view', 'watch', 'impression', 'reach'] },
    { key: 'shares', synonyms: ['share', 'retweet', 'forward'] },
    { key: 'saves', synonyms: ['save', 'bookmark'] },
    { key: 'votes', synonyms: ['votes', 'poll'] },
];

function detectPlatform(service) {
    const target = (service.category + ' ' + service.name).toLowerCase();
    for (const [platform, keywords] of Object.entries(platformKeywords)) {
        if (keywords.some(k => target.includes(k))) return platform;
    }
    return null;
}

function detectCategory(service) {
    const text = (service.category + ' ' + service.name).toLowerCase();
    for (const obj of categoryKeywords) {
        if (obj.synonyms.some(k => text.includes(k))) return obj.key;
    }
    return null;
}

function main() {
    const jsonPath = path.resolve(__dirname, 'services.json');
    const outputPath = path.resolve(__dirname, 'lib', 'constants.ts');

    // Create lib directory if it doesn't exist
    if (!fs.existsSync(path.join(__dirname, 'lib'))) {
        fs.mkdirSync(path.join(__dirname, 'lib'));
    }

    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    const result = {};

    data.forEach(service => {
        const platform = detectPlatform(service);
        if (!platform) return;

        const category = detectCategory(service);
        if (!category) return;

        // Initialize platform array if it doesn't exist
        if (!result[platform]) {
            result[platform] = [];
        }

        // Add unique categories only
        if (!result[platform].some(cat => cat.name === category)) {
            result[platform].push({
                name: category,
                alt: category.charAt(0).toUpperCase() + category.slice(1),
                icon: category
            });
        }
    });

    const tsContent = `// AUTO-GENERATED, do not edit manually
export const serviceCategories = ${JSON.stringify(result, null, 2)};

export const platforms = [
    { name: 'instagram', alt: 'Instagram' },
    { name: 'telegram', alt: 'Telegram' },
    { name: 'facebook', alt: 'Facebook' },
    { name: 'x', alt: 'X' },
    { name: 'tiktok', alt: 'TikTok' },
    { name: 'youtube', alt: 'YouTube' },
];
`;

    fs.writeFileSync(outputPath, tsContent);
    console.log('✅ Generated:', outputPath);
    console.log('📊 Services by platform:');
    Object.entries(result).forEach(([platform, services]) => {
        console.log(`  ${platform}: ${services.map(s => s.name).join(', ')}`);
    });
}

main();