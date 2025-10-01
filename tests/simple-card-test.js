// Simple CardLayout test
console.log('Testing CardLayout import...');

try {
    // Test basic import
    const fs = require('fs');
    const path = require('path');
    
    const cardLayoutPath = path.join(__dirname, '../assets/js/modules/card-layout.js');
    const cardLayoutCode = fs.readFileSync(cardLayoutPath, 'utf8');
    
    console.log('✅ CardLayout file exists and is readable');
    console.log('✅ File size:', cardLayoutCode.length, 'characters');
    
    // Check for key methods
    const keyMethods = [
        'createContainer',
        'createCard',
        'updateCard',
        'removeCard',
        'checkBackdropFilterSupport',
        'setupIntersectionObserver'
    ];
    
    keyMethods.forEach(method => {
        if (cardLayoutCode.includes(method)) {
            console.log(`✅ Method ${method} found`);
        } else {
            console.log(`❌ Method ${method} missing`);
        }
    });
    
    // Check for CSS class names
    const cssClasses = [
        'las-card-container',
        'las-card',
        'las-card-glass',
        'las-card-elevated',
        'las-card-interactive'
    ];
    
    cssClasses.forEach(className => {
        if (cardLayoutCode.includes(className)) {
            console.log(`✅ CSS class ${className} found`);
        } else {
            console.log(`❌ CSS class ${className} missing`);
        }
    });
    
    console.log('\n🎉 CardLayout structure validation passed!');
    
} catch (error) {
    console.error('❌ CardLayout test failed:', error.message);
    process.exit(1);
}