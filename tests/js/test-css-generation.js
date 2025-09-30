/**
 * CSS Generation Tests
 * Tests CSS generation with various input combinations and validation
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

describe('CSS Generation with Various Input Combinations', () => {
    let CSSGenerator;
    let mockAjaxResponse;
    
    beforeEach(() => {
        // Mock jQuery
        global.$ = global.jQuery = require('jquery');
        
        // Mock AJAX data
        global.lasAdminData = {
            ajaxurl: '/wp-admin/admin-ajax.php',
            nonce: 'test_nonce_12345'
        };
        
        // Mock AJAX response
        mockAjaxResponse = {
            success: true,
            data: {
                css: '',
                performance: { execution_time_ms: 100 }
            }
        };
        
        global.$.ajax = jest.fn(() => ({
            done: jest.fn((callback) => {
                callback(mockAjaxResponse);
                return { fail: jest.fn() };
            }),
            fail: jest.fn()
        }));
        
        // Initialize CSS Generator
        CSSGenerator = {
            validationRules: {
                color: {
                    pattern: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$|^rgba?\([^)]+\)$|^hsla?\([^)]+\)$/,
                    fallback: '#ffffff'
                },
                number: {
                    min: 0,
                    max: 9999,
                    fallback: 0
                },
                percentage: {
                    min: 0,
                    max: 100,
                    fallback: 0
                },
                url: {
                    pattern: /^https?:\/\/.+/,
                    fallback: ''
                }
            },
            
            generateCSS: function(settings) {
                const css = [];
                const validatedSettings = this.validateSettings(settings);
                
                // Admin Menu Background
                if (validatedSettings.admin_menu_bg_color) {
                    css.push(this.generateMenuBackgroundCSS(validatedSettings));
                }
                
                // Admin Menu Text
                if (validatedSettings.admin_menu_text_color) {
                    css.push(this.generateMenuTextCSS(validatedSettings));
                }
                
                // Admin Bar
                if (validatedSettings.admin_bar_bg_color || validatedSettings.admin_bar_text_color) {
                    css.push(this.generateAdminBarCSS(validatedSettings));
                }
                
                // Menu Width
                if (validatedSettings.admin_menu_width) {
                    css.push(this.generateMenuWidthCSS(validatedSettings));
                }
                
                // Border Radius
                if (validatedSettings.admin_menu_border_radius_type) {
                    css.push(this.generateBorderRadiusCSS(validatedSettings));
                }
                
                // Shadow
                if (validatedSettings.admin_menu_shadow_type) {
                    css.push(this.generateShadowCSS(validatedSettings));
                }
                
                // Gradient
                if (validatedSettings.admin_menu_bg_type === 'gradient') {
                    css.push(this.generateGradientCSS(validatedSettings));
                }
                
                return css.filter(Boolean).join('\n');
            },
            
            validateSettings: function(settings) {
                const validated = {};
                
                for (const [key, value] of Object.entries(settings)) {
                    validated[key] = this.validateValue(key, value);
                }
                
                return validated;
            },
            
            validateValue: function(key, value) {
                if (value === null || value === undefined || value === '') {
                    return '';
                }
                
                // Color validation
                if (key.includes('color')) {
                    return this.validateColor(value);
                }
                
                // Number validation
                if (key.includes('width') || key.includes('height') || key.includes('size') || 
                    key.includes('radius') || key.includes('offset') || key.includes('blur') || 
                    key.includes('spread')) {
                    return this.validateNumber(value);
                }
                
                // Percentage validation
                if (key.includes('opacity') || key.includes('percent')) {
                    return this.validatePercentage(value);
                }
                
                // URL validation
                if (key.includes('url') || key.includes('image')) {
                    return this.validateUrl(value);
                }
                
                return value;
            },
            
            validateColor: function(value) {
                const rule = this.validationRules.color;
                
                if (typeof value !== 'string') {
                    return rule.fallback;
                }
                
                // Test against color pattern
                if (rule.pattern.test(value.trim())) {
                    return value.trim();
                }
                
                // Try to parse named colors
                const namedColors = {
                    'red': '#ff0000',
                    'green': '#008000',
                    'blue': '#0000ff',
                    'white': '#ffffff',
                    'black': '#000000',
                    'transparent': 'transparent'
                };
                
                const lowerValue = value.toLowerCase().trim();
                if (namedColors[lowerValue]) {
                    return namedColors[lowerValue];
                }
                
                return rule.fallback;
            },
            
            validateNumber: function(value) {
                const rule = this.validationRules.number;
                const num = parseFloat(value);
                
                if (isNaN(num)) {
                    return rule.fallback;
                }
                
                return Math.max(rule.min, Math.min(rule.max, num));
            },
            
            validatePercentage: function(value) {
                const rule = this.validationRules.percentage;
                const num = parseFloat(value);
                
                if (isNaN(num)) {
                    return rule.fallback;
                }
                
                return Math.max(rule.min, Math.min(rule.max, num));
            },
            
            validateUrl: function(value) {
                const rule = this.validationRules.url;
                
                if (typeof value !== 'string') {
                    return rule.fallback;
                }
                
                if (rule.pattern.test(value.trim())) {
                    return value.trim();
                }
                
                return rule.fallback;
            },
            
            generateMenuBackgroundCSS: function(settings) {
                const css = [];
                const color = settings.admin_menu_bg_color;
                
                if (settings.admin_menu_bg_type === 'gradient') {
                    return ''; // Handled by generateGradientCSS
                }
                
                css.push(`
                    html body.wp-admin #adminmenuwrap {
                        background-color: ${color} !important;
                        background-image: none !important;
                    }
                `);
                
                css.push(`
                    html body.wp-admin #adminmenuback {
                        background: transparent !important;
                    }
                `);
                
                css.push(`
                    html body.wp-admin #adminmenu {
                        background-color: ${color} !important;
                        background-image: none !important;
                    }
                `);
                
                return css.join('\n');
            },
            
            generateMenuTextCSS: function(settings) {
                const color = settings.admin_menu_text_color;
                
                return `
                    html body.wp-admin #adminmenu a {
                        color: ${color} !important;
                    }
                    html body.wp-admin #adminmenu .wp-menu-name {
                        color: ${color} !important;
                    }
                `;
            },
            
            generateAdminBarCSS: function(settings) {
                const css = [];
                
                if (settings.admin_bar_bg_color) {
                    css.push(`
                        html body.wp-admin #wpadminbar {
                            background-color: ${settings.admin_bar_bg_color} !important;
                        }
                    `);
                }
                
                if (settings.admin_bar_text_color) {
                    css.push(`
                        html body.wp-admin #wpadminbar .ab-item {
                            color: ${settings.admin_bar_text_color} !important;
                        }
                    `);
                }
                
                return css.join('\n');
            },
            
            generateMenuWidthCSS: function(settings) {
                const width = settings.admin_menu_width;
                
                return `
                    html body.wp-admin #adminmenuwrap {
                        width: ${width}px !important;
                    }
                    html body.wp-admin #wpcontent,
                    html body.wp-admin #wpfooter {
                        margin-left: ${width}px !important;
                    }
                `;
            },
            
            generateBorderRadiusCSS: function(settings) {
                const css = [];
                const type = settings.admin_menu_border_radius_type;
                
                if (type === 'all') {
                    const radius = settings.admin_menu_border_radius_all;
                    css.push(`
                        html body.wp-admin #adminmenuwrap,
                        html body.wp-admin #adminmenuback {
                            border-radius: ${radius}px !important;
                            overflow: hidden !important;
                        }
                    `);
                } else if (type === 'individual') {
                    const tl = settings.admin_menu_border_radius_tl || 0;
                    const tr = settings.admin_menu_border_radius_tr || 0;
                    const br = settings.admin_menu_border_radius_br || 0;
                    const bl = settings.admin_menu_border_radius_bl || 0;
                    
                    css.push(`
                        html body.wp-admin #adminmenuwrap,
                        html body.wp-admin #adminmenuback {
                            border-top-left-radius: ${tl}px !important;
                            border-top-right-radius: ${tr}px !important;
                            border-bottom-right-radius: ${br}px !important;
                            border-bottom-left-radius: ${bl}px !important;
                            overflow: hidden !important;
                        }
                    `);
                }
                
                return css.join('\n');
            },
            
            generateShadowCSS: function(settings) {
                const type = settings.admin_menu_shadow_type;
                
                if (type === 'none') {
                    return `
                        html body.wp-admin #adminmenuwrap {
                            box-shadow: none !important;
                        }
                    `;
                }
                
                if (type === 'simple') {
                    const shadow = settings.admin_menu_shadow_simple;
                    return `
                        html body.wp-admin #adminmenuwrap {
                            box-shadow: ${shadow} !important;
                            position: relative !important;
                            z-index: 9990 !important;
                        }
                    `;
                }
                
                if (type === 'advanced') {
                    const x = settings.admin_menu_shadow_advanced_offset_x || 0;
                    const y = settings.admin_menu_shadow_advanced_offset_y || 0;
                    const blur = settings.admin_menu_shadow_advanced_blur || 0;
                    const spread = settings.admin_menu_shadow_advanced_spread || 0;
                    const color = settings.admin_menu_shadow_advanced_color || 'rgba(0,0,0,0.1)';
                    
                    return `
                        html body.wp-admin #adminmenuwrap {
                            box-shadow: ${x}px ${y}px ${blur}px ${spread}px ${color} !important;
                            position: relative !important;
                            z-index: 9990 !important;
                        }
                    `;
                }
                
                return '';
            },
            
            generateGradientCSS: function(settings) {
                const direction = settings.admin_menu_bg_gradient_direction || '45deg';
                const color1 = settings.admin_menu_bg_gradient_color1 || '#ffffff';
                const color2 = settings.admin_menu_bg_gradient_color2 || '#f0f0f0';
                
                return `
                    html body.wp-admin #adminmenuwrap {
                        background-image: linear-gradient(${direction}, ${color1}, ${color2}) !important;
                        background-color: transparent !important;
                    }
                    html body.wp-admin #adminmenuback {
                        background: transparent !important;
                    }
                    html body.wp-admin #adminmenu {
                        background-image: linear-gradient(${direction}, ${color1}, ${color2}) !important;
                        background-color: transparent !important;
                    }
                `;
            },
            
            sanitizeCSS: function(css) {
                // Remove potentially dangerous CSS
                const dangerous = [
                    'javascript:',
                    'expression(',
                    'behavior:',
                    'binding:',
                    '@import',
                    'document.cookie',
                    'vbscript:'
                ];
                
                let sanitized = css;
                dangerous.forEach(pattern => {
                    const regex = new RegExp(pattern, 'gi');
                    sanitized = sanitized.replace(regex, '');
                });
                
                return sanitized;
            },
            
            minifyCSS: function(css) {
                return css
                    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
                    .replace(/\s+/g, ' ') // Collapse whitespace
                    .replace(/;\s*}/g, '}') // Remove last semicolon in blocks
                    .replace(/\s*{\s*/g, '{') // Clean up braces
                    .replace(/\s*}\s*/g, '}')
                    .replace(/\s*;\s*/g, ';') // Clean up semicolons
                    .trim();
            }
        };
    });

    describe('Color Value Validation', () => {
        test('should validate hex colors correctly', () => {
            const validHex = ['#ffffff', '#000000', '#ff0000', '#abc', '#123'];
            const invalidHex = ['#gggggg', '#12345', 'ffffff', '#'];
            
            validHex.forEach(color => {
                expect(CSSGenerator.validateColor(color)).toBe(color);
            });
            
            invalidHex.forEach(color => {
                expect(CSSGenerator.validateColor(color)).toBe('#ffffff');
            });
        });

        test('should validate RGB/RGBA colors correctly', () => {
            const validRgb = [
                'rgb(255, 255, 255)',
                'rgba(255, 0, 0, 0.5)',
                'rgb(0,0,0)',
                'rgba(100, 200, 50, 1)'
            ];
            
            validRgb.forEach(color => {
                expect(CSSGenerator.validateColor(color)).toBe(color);
            });
        });

        test('should validate HSL/HSLA colors correctly', () => {
            const validHsl = [
                'hsl(360, 100%, 50%)',
                'hsla(180, 50%, 25%, 0.8)',
                'hsl(0,0%,0%)'
            ];
            
            validHsl.forEach(color => {
                expect(CSSGenerator.validateColor(color)).toBe(color);
            });
        });

        test('should handle named colors', () => {
            expect(CSSGenerator.validateColor('red')).toBe('#ff0000');
            expect(CSSGenerator.validateColor('blue')).toBe('#0000ff');
            expect(CSSGenerator.validateColor('transparent')).toBe('transparent');
            expect(CSSGenerator.validateColor('invalid-color')).toBe('#ffffff');
        });

        test('should handle invalid color inputs', () => {
            const invalidInputs = [null, undefined, 123, {}, [], ''];
            
            invalidInputs.forEach(input => {
                expect(CSSGenerator.validateColor(input)).toBe('#ffffff');
            });
        });
    });

    describe('Numeric Value Validation', () => {
        test('should validate numbers within range', () => {
            expect(CSSGenerator.validateNumber('100')).toBe(100);
            expect(CSSGenerator.validateNumber('0')).toBe(0);
            expect(CSSGenerator.validateNumber('9999')).toBe(9999);
        });

        test('should clamp numbers to valid range', () => {
            expect(CSSGenerator.validateNumber('-10')).toBe(0);
            expect(CSSGenerator.validateNumber('10000')).toBe(9999);
        });

        test('should handle invalid numeric inputs', () => {
            const invalidInputs = ['abc', null, undefined, {}, []];
            
            invalidInputs.forEach(input => {
                expect(CSSGenerator.validateNumber(input)).toBe(0);
            });
        });

        test('should handle decimal numbers', () => {
            expect(CSSGenerator.validateNumber('10.5')).toBe(10.5);
            expect(CSSGenerator.validateNumber('0.1')).toBe(0.1);
        });
    });

    describe('Percentage Value Validation', () => {
        test('should validate percentages within range', () => {
            expect(CSSGenerator.validatePercentage('50')).toBe(50);
            expect(CSSGenerator.validatePercentage('0')).toBe(0);
            expect(CSSGenerator.validatePercentage('100')).toBe(100);
        });

        test('should clamp percentages to valid range', () => {
            expect(CSSGenerator.validatePercentage('-10')).toBe(0);
            expect(CSSGenerator.validatePercentage('150')).toBe(100);
        });
    });

    describe('URL Validation', () => {
        test('should validate URLs correctly', () => {
            const validUrls = [
                'https://example.com/image.jpg',
                'http://test.com/file.png',
                'https://cdn.example.com/assets/image.svg'
            ];
            
            validUrls.forEach(url => {
                expect(CSSGenerator.validateUrl(url)).toBe(url);
            });
        });

        test('should reject invalid URLs', () => {
            const invalidUrls = [
                'ftp://example.com/file.jpg',
                'javascript:alert(1)',
                'data:image/png;base64,abc',
                'relative/path/image.jpg',
                ''
            ];
            
            invalidUrls.forEach(url => {
                expect(CSSGenerator.validateUrl(url)).toBe('');
            });
        });
    });

    describe('CSS Generation for Different Settings', () => {
        test('should generate admin menu background CSS', () => {
            const settings = {
                admin_menu_bg_color: '#ff0000',
                admin_menu_bg_type: 'solid'
            };
            
            const css = CSSGenerator.generateCSS(settings);
            
            expect(css).toContain('#adminmenuwrap');
            expect(css).toContain('background-color: #ff0000');
            expect(css).toContain('background-image: none');
        });

        test('should generate admin menu text CSS', () => {
            const settings = {
                admin_menu_text_color: '#ffffff'
            };
            
            const css = CSSGenerator.generateCSS(settings);
            
            expect(css).toContain('#adminmenu a');
            expect(css).toContain('color: #ffffff');
        });

        test('should generate admin bar CSS', () => {
            const settings = {
                admin_bar_bg_color: '#333333',
                admin_bar_text_color: '#ffffff'
            };
            
            const css = CSSGenerator.generateCSS(settings);
            
            expect(css).toContain('#wpadminbar');
            expect(css).toContain('background-color: #333333');
            expect(css).toContain('color: #ffffff');
        });

        test('should generate menu width CSS', () => {
            const settings = {
                admin_menu_width: '250'
            };
            
            const css = CSSGenerator.generateCSS(settings);
            
            expect(css).toContain('width: 250px');
            expect(css).toContain('margin-left: 250px');
        });

        test('should generate border radius CSS for all corners', () => {
            const settings = {
                admin_menu_border_radius_type: 'all',
                admin_menu_border_radius_all: '10'
            };
            
            const css = CSSGenerator.generateCSS(settings);
            
            expect(css).toContain('border-radius: 10px');
            expect(css).toContain('overflow: hidden');
        });

        test('should generate border radius CSS for individual corners', () => {
            const settings = {
                admin_menu_border_radius_type: 'individual',
                admin_menu_border_radius_tl: '5',
                admin_menu_border_radius_tr: '10',
                admin_menu_border_radius_br: '15',
                admin_menu_border_radius_bl: '20'
            };
            
            const css = CSSGenerator.generateCSS(settings);
            
            expect(css).toContain('border-top-left-radius: 5px');
            expect(css).toContain('border-top-right-radius: 10px');
            expect(css).toContain('border-bottom-right-radius: 15px');
            expect(css).toContain('border-bottom-left-radius: 20px');
        });

        test('should generate simple shadow CSS', () => {
            const settings = {
                admin_menu_shadow_type: 'simple',
                admin_menu_shadow_simple: '0 2px 4px rgba(0,0,0,0.1)'
            };
            
            const css = CSSGenerator.generateCSS(settings);
            
            expect(css).toContain('box-shadow: 0 2px 4px rgba(0,0,0,0.1)');
            expect(css).toContain('z-index: 9990');
        });

        test('should generate advanced shadow CSS', () => {
            const settings = {
                admin_menu_shadow_type: 'advanced',
                admin_menu_shadow_advanced_offset_x: '2',
                admin_menu_shadow_advanced_offset_y: '4',
                admin_menu_shadow_advanced_blur: '8',
                admin_menu_shadow_advanced_spread: '1',
                admin_menu_shadow_advanced_color: 'rgba(0,0,0,0.2)'
            };
            
            const css = CSSGenerator.generateCSS(settings);
            
            expect(css).toContain('box-shadow: 2px 4px 8px 1px rgba(0,0,0,0.2)');
        });

        test('should generate gradient CSS', () => {
            const settings = {
                admin_menu_bg_type: 'gradient',
                admin_menu_bg_gradient_direction: '45deg',
                admin_menu_bg_gradient_color1: '#ff0000',
                admin_menu_bg_gradient_color2: '#0000ff'
            };
            
            const css = CSSGenerator.generateCSS(settings);
            
            expect(css).toContain('linear-gradient(45deg, #ff0000, #0000ff)');
            expect(css).toContain('background-color: transparent');
        });

        test('should handle no shadow setting', () => {
            const settings = {
                admin_menu_shadow_type: 'none'
            };
            
            const css = CSSGenerator.generateCSS(settings);
            
            expect(css).toContain('box-shadow: none');
        });
    });

    describe('Complex Setting Combinations', () => {
        test('should generate CSS for multiple settings', () => {
            const settings = {
                admin_menu_bg_color: '#333333',
                admin_menu_text_color: '#ffffff',
                admin_menu_width: '220',
                admin_menu_border_radius_type: 'all',
                admin_menu_border_radius_all: '8',
                admin_menu_shadow_type: 'simple',
                admin_menu_shadow_simple: '0 2px 4px rgba(0,0,0,0.1)'
            };
            
            const css = CSSGenerator.generateCSS(settings);
            
            expect(css).toContain('background-color: #333333');
            expect(css).toContain('color: #ffffff');
            expect(css).toContain('width: 220px');
            expect(css).toContain('border-radius: 8px');
            expect(css).toContain('box-shadow: 0 2px 4px rgba(0,0,0,0.1)');
        });

        test('should handle gradient with border radius and shadow', () => {
            const settings = {
                admin_menu_bg_type: 'gradient',
                admin_menu_bg_gradient_direction: '90deg',
                admin_menu_bg_gradient_color1: '#ff6b6b',
                admin_menu_bg_gradient_color2: '#4ecdc4',
                admin_menu_border_radius_type: 'all',
                admin_menu_border_radius_all: '12',
                admin_menu_shadow_type: 'advanced',
                admin_menu_shadow_advanced_offset_x: '0',
                admin_menu_shadow_advanced_offset_y: '4',
                admin_menu_shadow_advanced_blur: '12',
                admin_menu_shadow_advanced_spread: '0',
                admin_menu_shadow_advanced_color: 'rgba(0,0,0,0.15)'
            };
            
            const css = CSSGenerator.generateCSS(settings);
            
            expect(css).toContain('linear-gradient(90deg, #ff6b6b, #4ecdc4)');
            expect(css).toContain('border-radius: 12px');
            expect(css).toContain('box-shadow: 0px 4px 12px 0px rgba(0,0,0,0.15)');
            expect(css).toContain('overflow: hidden');
        });

        test('should validate all settings in combination', () => {
            const settings = {
                admin_menu_bg_color: 'invalid-color',
                admin_menu_width: '-50',
                admin_menu_border_radius_all: '10000',
                admin_menu_shadow_advanced_blur: 'abc'
            };
            
            const validatedSettings = CSSGenerator.validateSettings(settings);
            
            expect(validatedSettings.admin_menu_bg_color).toBe('#ffffff');
            expect(validatedSettings.admin_menu_width).toBe(0);
            expect(validatedSettings.admin_menu_border_radius_all).toBe(9999);
            expect(validatedSettings.admin_menu_shadow_advanced_blur).toBe(0);
        });
    });

    describe('CSS Security and Sanitization', () => {
        test('should sanitize dangerous CSS content', () => {
            const dangerousCSS = `
                body { 
                    background: url('javascript:alert(1)'); 
                    behavior: url('malicious.htc');
                    expression: alert('xss');
                }
                @import url('malicious.css');
            `;
            
            const sanitized = CSSGenerator.sanitizeCSS(dangerousCSS);
            
            expect(sanitized).not.toContain('javascript:');
            expect(sanitized).not.toContain('behavior:');
            expect(sanitized).not.toContain('expression:');
            expect(sanitized).not.toContain('@import');
        });

        test('should preserve safe CSS content', () => {
            const safeCSS = `
                body { 
                    background-color: #ffffff;
                    color: rgb(0, 0, 0);
                    font-size: 14px;
                }
            `;
            
            const sanitized = CSSGenerator.sanitizeCSS(safeCSS);
            
            expect(sanitized).toContain('background-color: #ffffff');
            expect(sanitized).toContain('color: rgb(0, 0, 0)');
            expect(sanitized).toContain('font-size: 14px');
        });
    });

    describe('CSS Minification', () => {
        test('should minify CSS correctly', () => {
            const css = `
                /* This is a comment */
                body {
                    background-color: #ffffff ;
                    color: #000000 ;
                }
                
                .class {
                    margin: 10px ;
                }
            `;
            
            const minified = CSSGenerator.minifyCSS(css);
            
            expect(minified).not.toContain('/*');
            expect(minified).not.toContain('*/');
            expect(minified).not.toContain('\n');
            expect(minified).toContain('body{background-color:#ffffff;color:#000000}');
        });

        test('should handle empty CSS', () => {
            expect(CSSGenerator.minifyCSS('')).toBe('');
            expect(CSSGenerator.minifyCSS('   ')).toBe('');
        });
    });

    describe('Edge Cases and Error Handling', () => {
        test('should handle empty settings object', () => {
            const css = CSSGenerator.generateCSS({});
            expect(css).toBe('');
        });

        test('should handle null/undefined settings', () => {
            expect(() => {
                CSSGenerator.generateCSS(null);
            }).not.toThrow();
            
            expect(() => {
                CSSGenerator.generateCSS(undefined);
            }).not.toThrow();
        });

        test('should handle settings with null values', () => {
            const settings = {
                admin_menu_bg_color: null,
                admin_menu_text_color: undefined,
                admin_menu_width: ''
            };
            
            const validatedSettings = CSSGenerator.validateSettings(settings);
            
            expect(validatedSettings.admin_menu_bg_color).toBe('');
            expect(validatedSettings.admin_menu_text_color).toBe('');
            expect(validatedSettings.admin_menu_width).toBe('');
        });

        test('should handle malformed gradient settings', () => {
            const settings = {
                admin_menu_bg_type: 'gradient',
                admin_menu_bg_gradient_color1: 'invalid',
                admin_menu_bg_gradient_color2: null,
                admin_menu_bg_gradient_direction: ''
            };
            
            const css = CSSGenerator.generateCSS(settings);
            
            // Should use fallback values
            expect(css).toContain('linear-gradient(45deg, #ffffff, #f0f0f0)');
        });

        test('should handle extreme numeric values', () => {
            const settings = {
                admin_menu_width: '999999',
                admin_menu_border_radius_all: '-100'
            };
            
            const validatedSettings = CSSGenerator.validateSettings(settings);
            
            expect(validatedSettings.admin_menu_width).toBe(9999);
            expect(validatedSettings.admin_menu_border_radius_all).toBe(0);
        });
    });

    describe('Performance Considerations', () => {
        test('should generate CSS efficiently for large setting objects', () => {
            const largeSettings = {};
            
            // Create 100 settings
            for (let i = 0; i < 100; i++) {
                largeSettings[`setting_${i}`] = `value_${i}`;
            }
            
            const startTime = Date.now();
            CSSGenerator.generateCSS(largeSettings);
            const endTime = Date.now();
            
            // Should complete within reasonable time (100ms)
            expect(endTime - startTime).toBeLessThan(100);
        });

        test('should handle repeated validation calls efficiently', () => {
            const testValue = '#ff0000';
            
            const startTime = Date.now();
            for (let i = 0; i < 1000; i++) {
                CSSGenerator.validateColor(testValue);
            }
            const endTime = Date.now();
            
            // Should complete within reasonable time (50ms)
            expect(endTime - startTime).toBeLessThan(50);
        });
    });
});