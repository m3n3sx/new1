/**
 * Comprehensive Unit Tests for LASSettingsValidator
 * Tests data validation, sanitization, and security measures
 */

describe('LASSettingsValidator - Comprehensive Tests', () => {
    let validator;

    beforeEach(() => {
        validator = new LASSettingsValidator();
    });

    describe('Color Validation and Sanitization', () => {
        describe('Hex Colors', () => {
            test('should validate 6-digit hex colors', () => {
                expect(validator.validateAndSanitize('menu_background_color', '#123456')).toBe('#123456');
                expect(validator.validateAndSanitize('menu_background_color', '#ABCDEF')).toBe('#ABCDEF');
                expect(validator.validateAndSanitize('menu_background_color', '#abcdef')).toBe('#abcdef');
            });

            test('should convert 3-digit hex to 6-digit', () => {
                expect(validator.validateAndSanitize('menu_background_color', '#abc')).toBe('#aabbcc');
                expect(validator.validateAndSanitize('menu_background_color', '#ABC')).toBe('#AABBCC');
                expect(validator.validateAndSanitize('menu_background_color', '#123')).toBe('#112233');
            });

            test('should reject invalid hex colors', () => {
                expect(validator.validateAndSanitize('menu_background_color', '#gggggg')).toBe('#000000');
                expect(validator.validateAndSanitize('menu_background_color', '#12345')).toBe('#000000');
                expect(validator.validateAndSanitize('menu_background_color', '#1234567')).toBe('#000000');
                expect(validator.validateAndSanitize('menu_background_color', 'abc123')).toBe('#000000');
            });
        });

        describe('RGB/RGBA Colors', () => {
            test('should validate RGB colors', () => {
                expect(validator.validateAndSanitize('menu_background_color', 'rgb(255, 128, 0)')).toBe('rgb(255, 128, 0)');
                expect(validator.validateAndSanitize('menu_background_color', 'rgb(0, 0, 0)')).toBe('rgb(0, 0, 0)');
                expect(validator.validateAndSanitize('menu_background_color', 'rgb(255, 255, 255)')).toBe('rgb(255, 255, 255)');
            });

            test('should validate RGBA colors', () => {
                expect(validator.validateAndSanitize('menu_background_color', 'rgba(255, 128, 0, 0.5)')).toBe('rgba(255, 128, 0, 0.5)');
                expect(validator.validateAndSanitize('menu_background_color', 'rgba(0, 0, 0, 1)')).toBe('rgba(0, 0, 0, 1)');
                expect(validator.validateAndSanitize('menu_background_color', 'rgba(255, 255, 255, 0)')).toBe('rgba(255, 255, 255, 0)');
            });

            test('should reject invalid RGB/RGBA colors', () => {
                expect(validator.validateAndSanitize('menu_background_color', 'rgb(256, 128, 0)')).toBe('#000000');
                expect(validator.validateAndSanitize('menu_background_color', 'rgb(255, 128)')).toBe('#000000');
                expect(validator.validateAndSanitize('menu_background_color', 'rgba(255, 128, 0)')).toBe('#000000');
                expect(validator.validateAndSanitize('menu_background_color', 'rgba(255, 128, 0, 2)')).toBe('#000000');
            });
        });

        describe('Named Colors', () => {
            test('should validate basic named colors', () => {
                expect(validator.validateAndSanitize('menu_background_color', 'transparent')).toBe('transparent');
                expect(validator.validateAndSanitize('menu_background_color', 'inherit')).toBe('inherit');
                expect(validator.validateAndSanitize('menu_background_color', 'black')).toBe('black');
                expect(validator.validateAndSanitize('menu_background_color', 'white')).toBe('white');
            });

            test('should be case insensitive for named colors', () => {
                expect(validator.validateAndSanitize('menu_background_color', 'BLACK')).toBe('BLACK');
                expect(validator.validateAndSanitize('menu_background_color', 'White')).toBe('White');
                expect(validator.validateAndSanitize('menu_background_color', 'TRANSPARENT')).toBe('TRANSPARENT');
            });

            test('should reject invalid named colors', () => {
                expect(validator.validateAndSanitize('menu_background_color', 'invalidcolor')).toBe('#000000');
                expect(validator.validateAndSanitize('menu_background_color', 'purple')).toBe('#000000'); // Not in basic set
            });
        });
    });

    describe('Boolean Validation and Sanitization', () => {
        test('should handle native boolean values', () => {
            expect(validator.validateAndSanitize('enable_live_preview', true)).toBe(true);
            expect(validator.validateAndSanitize('enable_live_preview', false)).toBe(false);
        });

        test('should convert string booleans', () => {
            expect(validator.validateAndSanitize('enable_live_preview', 'true')).toBe(true);
            expect(validator.validateAndSanitize('enable_live_preview', 'false')).toBe(false);
            expect(validator.validateAndSanitize('enable_live_preview', 'TRUE')).toBe(true);
            expect(validator.validateAndSanitize('enable_live_preview', 'FALSE')).toBe(false);
        });

        test('should convert numeric booleans', () => {
            expect(validator.validateAndSanitize('enable_live_preview', 1)).toBe(true);
            expect(validator.validateAndSanitize('enable_live_preview', 0)).toBe(false);
            expect(validator.validateAndSanitize('enable_live_preview', '1')).toBe(true);
            expect(validator.validateAndSanitize('enable_live_preview', '0')).toBe(false);
        });

        test('should handle edge cases', () => {
            expect(validator.validateAndSanitize('enable_live_preview', null)).toBe(false);
            expect(validator.validateAndSanitize('enable_live_preview', undefined)).toBe(false);
            expect(validator.validateAndSanitize('enable_live_preview', '')).toBe(false);
            expect(validator.validateAndSanitize('enable_live_preview', 'anything')).toBe(false);
            expect(validator.validateAndSanitize('enable_live_preview', 42)).toBe(true);
        });
    });

    describe('Number Validation and Sanitization', () => {
        test('should handle integer numbers', () => {
            expect(validator.validateAndSanitize('font_size', 16)).toBe(16);
            expect(validator.validateAndSanitize('font_size', '16')).toBe(16);
            expect(validator.validateAndSanitize('font_size', '0')).toBe(0);
            expect(validator.validateAndSanitize('font_size', '-5')).toBe(-5);
        });

        test('should handle decimal numbers', () => {
            expect(validator.validateAndSanitize('font_size', 16.5)).toBe(16.5);
            expect(validator.validateAndSanitize('font_size', '16.5')).toBe(16.5);
            expect(validator.validateAndSanitize('font_size', '0.5')).toBe(0.5);
            expect(validator.validateAndSanitize('font_size', '-2.5')).toBe(-2.5);
        });

        test('should handle edge cases and invalid numbers', () => {
            expect(validator.validateAndSanitize('font_size', 'invalid')).toBe(0);
            expect(validator.validateAndSanitize('font_size', '')).toBe(0);
            expect(validator.validateAndSanitize('font_size', null)).toBe(0);
            expect(validator.validateAndSanitize('font_size', undefined)).toBe(0);
            expect(validator.validateAndSanitize('font_size', 'abc123')).toBe(0);
        });

        test('should handle special numeric values', () => {
            expect(validator.validateAndSanitize('font_size', Infinity)).toBe(0); // Should reject infinite
            expect(validator.validateAndSanitize('font_size', -Infinity)).toBe(0); // Should reject infinite
            expect(validator.validateAndSanitize('font_size', NaN)).toBe(0); // Should reject NaN
        });
    });

    describe('URL Validation and Sanitization', () => {
        test('should validate absolute URLs', () => {
            expect(validator.validateAndSanitize('logo_url', 'https://example.com')).toBe('https://example.com');
            expect(validator.validateAndSanitize('logo_url', 'http://example.com')).toBe('http://example.com');
            expect(validator.validateAndSanitize('logo_url', 'https://example.com/path/to/file.jpg')).toBe('https://example.com/path/to/file.jpg');
        });

        test('should validate relative URLs', () => {
            expect(validator.validateAndSanitize('logo_url', '/path/to/file.jpg')).toBe('/path/to/file.jpg');
            expect(validator.validateAndSanitize('logo_url', 'example.com')).toBe('example.com');
        });

        test('should trim whitespace from URLs', () => {
            expect(validator.validateAndSanitize('logo_url', '  https://example.com  ')).toBe('https://example.com');
            expect(validator.validateAndSanitize('logo_url', '\\n/path/to/file\\t')).toBe('/path/to/file');
        });

        test('should handle invalid URLs', () => {
            expect(validator.validateAndSanitize('logo_url', 'not a url')).toBe('not a url'); // Fallback to string
            expect(validator.validateAndSanitize('logo_url', '')).toBe('');
            expect(validator.validateAndSanitize('logo_url', null)).toBe('');
        });
    });

    describe('Email Validation and Sanitization', () => {
        test('should validate proper email addresses', () => {
            expect(validator.validateAndSanitize('admin_email', 'test@example.com')).toBe('test@example.com');
            expect(validator.validateAndSanitize('admin_email', 'user.name@domain.co.uk')).toBe('user.name@domain.co.uk');
            expect(validator.validateAndSanitize('admin_email', 'test+tag@example.com')).toBe('test+tag@example.com');
        });

        test('should normalize email case', () => {
            expect(validator.validateAndSanitize('admin_email', 'TEST@EXAMPLE.COM')).toBe('test@example.com');
            expect(validator.validateAndSanitize('admin_email', 'User.Name@Domain.Com')).toBe('user.name@domain.com');
        });

        test('should trim whitespace from emails', () => {
            expect(validator.validateAndSanitize('admin_email', '  test@example.com  ')).toBe('test@example.com');
        });

        test('should reject invalid email addresses', () => {
            expect(validator.validateAndSanitize('admin_email', 'invalid-email')).toBe('');
            expect(validator.validateAndSanitize('admin_email', '@example.com')).toBe('');
            expect(validator.validateAndSanitize('admin_email', 'test@')).toBe('');
            expect(validator.validateAndSanitize('admin_email', 'test@.com')).toBe('');
        });
    });

    describe('CSS Validation and Sanitization', () => {
        test('should allow safe CSS properties', () => {
            const safeCss = 'color: red; background-color: blue; font-size: 16px;';
            expect(validator.validateAndSanitize('custom_css', safeCss)).toBe(safeCss);
        });

        test('should remove dangerous JavaScript patterns', () => {
            const dangerousCss = 'color: red; javascript: alert("xss"); background: blue;';
            const result = validator.validateAndSanitize('custom_css', dangerousCss);
            expect(result).not.toContain('javascript:');
            expect(result).toContain('color: red;');
            expect(result).toContain('background: blue;');
        });

        test('should remove expression() calls', () => {
            const dangerousCss = 'width: expression(alert("xss")); height: 100px;';
            const result = validator.validateAndSanitize('custom_css', dangerousCss);
            expect(result).not.toContain('expression(');
            expect(result).toContain('height: 100px;');
        });

        test('should remove @import statements', () => {
            const dangerousCss = '@import url("malicious.css"); color: red;';
            const result = validator.validateAndSanitize('custom_css', dangerousCss);
            expect(result).not.toContain('@import');
            expect(result).toContain('color: red;');
        });

        test('should remove behavior properties', () => {
            const dangerousCss = 'behavior: url("malicious.htc"); color: red;';
            const result = validator.validateAndSanitize('custom_css', dangerousCss);
            expect(result).not.toContain('behavior:');
            expect(result).toContain('color: red;');
        });

        test('should remove -moz-binding properties', () => {
            const dangerousCss = '-moz-binding: url("malicious.xml"); color: red;';
            const result = validator.validateAndSanitize('custom_css', dangerousCss);
            expect(result).not.toContain('-moz-binding');
            expect(result).toContain('color: red;');
        });

        test('should remove vbscript patterns', () => {
            const dangerousCss = 'color: red; vbscript: msgbox("xss");';
            const result = validator.validateAndSanitize('custom_css', dangerousCss);
            expect(result).not.toContain('vbscript:');
            expect(result).toContain('color: red;');
        });

        test('should be case insensitive for dangerous patterns', () => {
            const dangerousCss = 'JAVASCRIPT: alert("xss"); EXPRESSION(alert("xss"));';
            const result = validator.validateAndSanitize('custom_css', dangerousCss);
            expect(result).not.toContain('JAVASCRIPT:');
            expect(result).not.toContain('EXPRESSION(');
        });
    });

    describe('String Validation and Sanitization', () => {
        test('should escape HTML entities', () => {
            const input = '<script>alert("xss")</script>';
            const expected = '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;';
            expect(validator.validateAndSanitize('text_setting', input)).toBe(expected);
        });

        test('should escape all dangerous HTML characters', () => {
            const input = '<>"\'&/';
            const result = validator.validateAndSanitize('text_setting', input);
            expect(result).toContain('&lt;');
            expect(result).toContain('&gt;');
            expect(result).toContain('&quot;');
            expect(result).toContain('&#x27;');
            expect(result).toContain('&#x2F;');
        });

        test('should trim whitespace', () => {
            expect(validator.validateAndSanitize('text_setting', '  hello world  ')).toBe('hello world');
            expect(validator.validateAndSanitize('text_setting', '\\n\\ttest\\r\\n')).toBe('test');
        });

        test('should limit string length', () => {
            const longString = 'a'.repeat(15000);
            const result = validator.validateAndSanitize('text_setting', longString);
            expect(result.length).toBe(10000);
            expect(result).toBe('a'.repeat(10000));
        });

        test('should handle non-string inputs', () => {
            expect(validator.validateAndSanitize('text_setting', 123)).toBe('123');
            expect(validator.validateAndSanitize('text_setting', null)).toBe('');
            expect(validator.validateAndSanitize('text_setting', undefined)).toBe('');
            expect(validator.validateAndSanitize('text_setting', {})).toBe('[object Object]');
        });
    });

    describe('Type Detection', () => {
        test('should detect color settings by suffix', () => {
            expect(validator.getSettingType('menu_background_color')).toBe('color');
            expect(validator.getSettingType('text_color')).toBe('color');
            expect(validator.getSettingType('border_colour')).toBe('color');
            expect(validator.getSettingType('hover_color')).toBe('color');
        });

        test('should detect boolean settings by prefix and suffix', () => {
            expect(validator.getSettingType('enable_feature')).toBe('boolean');
            expect(validator.getSettingType('disable_animation')).toBe('boolean');
            expect(validator.getSettingType('feature_enabled')).toBe('boolean');
            expect(validator.getSettingType('animation_disabled')).toBe('boolean');
            expect(validator.getSettingType('auto_save')).toBe('boolean');
            expect(validator.getSettingType('debug_mode')).toBe('boolean');
        });

        test('should detect number settings by suffix', () => {
            expect(validator.getSettingType('font_size')).toBe('number');
            expect(validator.getSettingType('menu_width')).toBe('number');
            expect(validator.getSettingType('container_height')).toBe('number');
            expect(validator.getSettingType('animation_delay')).toBe('number');
            expect(validator.getSettingType('request_timeout')).toBe('number');
        });

        test('should detect URL settings by suffix', () => {
            expect(validator.getSettingType('logo_url')).toBe('url');
            expect(validator.getSettingType('external_link')).toBe('url');
            expect(validator.getSettingType('api_url')).toBe('url');
        });

        test('should detect CSS settings by suffix', () => {
            expect(validator.getSettingType('custom_css')).toBe('css');
            expect(validator.getSettingType('additional_style')).toBe('css');
            expect(validator.getSettingType('override_css')).toBe('css');
        });

        test('should detect email settings by suffix', () => {
            expect(validator.getSettingType('admin_email')).toBe('email');
            expect(validator.getSettingType('contact_mail')).toBe('email');
            expect(validator.getSettingType('notification_email')).toBe('email');
        });

        test('should default to string for unknown patterns', () => {
            expect(validator.getSettingType('unknown_setting')).toBe('string');
            expect(validator.getSettingType('random_value')).toBe('string');
            expect(validator.getSettingType('custom_field')).toBe('string');
        });
    });

    describe('Error Handling and Edge Cases', () => {
        test('should handle null and undefined values gracefully', () => {
            expect(() => validator.validateAndSanitize('test_setting', null)).not.toThrow();
            expect(() => validator.validateAndSanitize('test_setting', undefined)).not.toThrow();
            expect(validator.validateAndSanitize('test_setting', null)).toBe('');
            expect(validator.validateAndSanitize('test_setting', undefined)).toBe('');
        });

        test('should handle empty strings', () => {
            expect(validator.validateAndSanitize('text_setting', '')).toBe('');
            expect(validator.validateAndSanitize('menu_background_color', '')).toBe('#000000');
            expect(validator.validateAndSanitize('enable_feature', '')).toBe(false);
        });

        test('should handle objects and arrays', () => {
            const obj = { key: 'value' };
            const arr = [1, 2, 3];
            
            expect(validator.validateAndSanitize('text_setting', obj)).toBe('[object Object]');
            expect(validator.validateAndSanitize('text_setting', arr)).toBe('1,2,3');
        });

        test('should handle circular references gracefully', () => {
            const circular = {};
            circular.self = circular;
            
            expect(() => validator.validateAndSanitize('text_setting', circular)).not.toThrow();
        });

        test('should handle very large numbers', () => {
            expect(validator.validateAndSanitize('font_size', Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);
            expect(validator.validateAndSanitize('font_size', Number.MIN_SAFE_INTEGER)).toBe(Number.MIN_SAFE_INTEGER);
        });

        test('should handle unicode characters', () => {
            const unicode = '🎨 Unicode test 中文 العربية';
            const result = validator.validateAndSanitize('text_setting', unicode);
            expect(result).toBe(unicode); // Should preserve unicode
        });
    });

    describe('Security Tests', () => {
        test('should prevent XSS in text fields', () => {
            const xssAttempts = [
                '<script>alert("xss")</script>',
                '<img src="x" onerror="alert(1)">',
                '<svg onload="alert(1)">',
                'javascript:alert("xss")',
                'data:text/html,<script>alert(1)</script>'
            ];

            xssAttempts.forEach(xss => {
                const result = validator.validateAndSanitize('text_setting', xss);
                expect(result).not.toContain('<script');
                expect(result).not.toContain('onerror');
                expect(result).not.toContain('onload');
                expect(result).not.toContain('javascript:');
            });
        });

        test('should prevent CSS injection attacks', () => {
            const cssAttacks = [
                'body { background: url("javascript:alert(1)"); }',
                'div { behavior: url("malicious.htc"); }',
                '@import "javascript:alert(1)";',
                'p { -moz-binding: url("data:text/xml,<script>alert(1)</script>"); }'
            ];

            cssAttacks.forEach(attack => {
                const result = validator.validateAndSanitize('custom_css', attack);
                expect(result).not.toContain('javascript:');
                expect(result).not.toContain('behavior:');
                expect(result).not.toContain('@import');
                expect(result).not.toContain('-moz-binding');
            });
        });

        test('should prevent SQL injection patterns in strings', () => {
            const sqlAttempts = [
                "'; DROP TABLE users; --",
                "' OR '1'='1",
                "UNION SELECT * FROM admin",
                "<script>alert('sql')</script>"
            ];

            sqlAttempts.forEach(sql => {
                const result = validator.validateAndSanitize('text_setting', sql);
                expect(result).not.toContain('<script');
                expect(result).toContain('&#x27;'); // Single quotes should be escaped
            });
        });

        test('should handle malformed input gracefully', () => {
            const malformedInputs = [
                '\\x00\\x01\\x02', // Null bytes
                '\\uFEFF', // BOM
                '\\r\\n\\t', // Control characters
                String.fromCharCode(0, 1, 2, 3) // More null bytes
            ];

            malformedInputs.forEach(input => {
                expect(() => validator.validateAndSanitize('text_setting', input)).not.toThrow();
            });
        });
    });

    describe('Performance Tests', () => {
        test('should handle large strings efficiently', () => {
            const largeString = 'a'.repeat(50000);
            const start = performance.now();
            
            const result = validator.validateAndSanitize('text_setting', largeString);
            
            const end = performance.now();
            const duration = end - start;
            
            expect(result.length).toBe(10000); // Should be truncated
            expect(duration).toBeLessThan(100); // Should complete in under 100ms
        });

        test('should handle many small validations efficiently', () => {
            const start = performance.now();
            
            for (let i = 0; i < 1000; i++) {
                validator.validateAndSanitize('menu_background_color', '#123456');
                validator.validateAndSanitize('enable_feature', true);
                validator.validateAndSanitize('font_size', 16);
            }
            
            const end = performance.now();
            const duration = end - start;
            
            expect(duration).toBeLessThan(500); // Should complete 3000 validations in under 500ms
        });
    });
});