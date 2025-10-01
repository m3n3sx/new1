// Debug script for live preview
console.log('=== Live Preview Debug ===');

// Check if jQuery is available
if (typeof jQuery !== 'undefined') {
    console.log('✓ jQuery is available');
} else {
    console.log('✗ jQuery is NOT available');
}

// Check if lasAdminData is available
if (typeof lasAdminData !== 'undefined') {
    console.log('✓ lasAdminData is available:', lasAdminData);
    
    // Check required properties
    const required = ['ajax_url', 'nonce', 'ajax_actions'];
    required.forEach(prop => {
        if (lasAdminData[prop]) {
            console.log(`✓ ${prop}:`, lasAdminData[prop]);
        } else {
            console.log(`✗ ${prop} is missing`);
        }
    });
    
    // Check if get_preview_css action is available
    if (lasAdminData.ajax_actions && lasAdminData.ajax_actions.get_preview_css) {
        console.log('✓ get_preview_css action:', lasAdminData.ajax_actions.get_preview_css);
    } else {
        console.log('✗ get_preview_css action is missing');
    }
} else {
    console.log('✗ lasAdminData is NOT available');
}

// Test AJAX call if everything is available
if (typeof jQuery !== 'undefined' && typeof lasAdminData !== 'undefined') {
    console.log('Testing AJAX call...');
    
    jQuery.post(lasAdminData.ajax_url, {
        action: 'las_get_preview_css',
        nonce: lasAdminData.nonce,
        setting: 'test_setting',
        value: '#ff0000'
    })
    .done(function(response) {
        console.log('✓ AJAX Success:', response);
    })
    .fail(function(xhr, status, error) {
        console.log('✗ AJAX Failed:', status, error);
        console.log('Response Text:', xhr.responseText);
        console.log('Status Code:', xhr.status);
    });
}

console.log('=== Debug Complete ===');