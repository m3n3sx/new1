# Live Admin Styler v2.0 - Setup Guide

## Quick Start

This guide will help you set up a development environment for Live Admin Styler v2.0 in under 10 minutes.

## Prerequisites

Before you begin, ensure you have:

- **PHP 7.4+** installed
- **Node.js 16+** and npm
- **Composer** for PHP dependency management
- **Git** for version control
- A **WordPress development environment** (Local, XAMPP, Docker, etc.)

## Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/your-username/live-admin-styler.git
cd live-admin-styler

# Create your feature branch
git checkout -b feature/your-feature-name
```

## Step 2: Install Dependencies

```bash
# Install PHP dependencies
composer install

# Install Node.js dependencies
npm install

# Install global development tools (optional but recommended)
npm install -g eslint prettier jsdoc
composer global require squizlabs/php_codesniffer
composer global require wp-coding-standards/wpcs
```

## Step 3: Configure WordPress

### Option A: Using Local by Flywheel

1. Create a new WordPress site in Local
2. Navigate to the plugins directory:
   ```bash
   cd ~/Local\ Sites/your-site/app/public/wp-content/plugins/
   ```
3. Create a symlink to your development directory:
   ```bash
   ln -s /path/to/live-admin-styler live-admin-styler
   ```

### Option B: Using XAMPP/MAMP

1. Copy or symlink the plugin to your WordPress plugins directory:
   ```bash
   # Copy
   cp -r live-admin-styler /path/to/xampp/htdocs/wordpress/wp-content/plugins/
   
   # Or symlink (recommended)
   ln -s /path/to/live-admin-styler /path/to/xampp/htdocs/wordpress/wp-content/plugins/
   ```

### Option C: Using Docker

1. Use the provided Docker setup:
   ```bash
   # Start WordPress with Docker
   docker-compose up -d
   
   # The plugin will be automatically mounted
   ```

## Step 4: Configure Development Environment

### WordPress Configuration

Add these lines to your `wp-config.php`:

```php
// Enable WordPress debugging
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);

// Enable Live Admin Styler debugging
define('LAS_DEBUG', true);

// Optional: Enable script debugging
define('SCRIPT_DEBUG', true);
```

### PHP Configuration

Ensure your PHP configuration has:

```ini
; Increase memory limit
memory_limit = 256M

; Enable error reporting
display_errors = On
error_reporting = E_ALL

; Increase execution time
max_execution_time = 300
```

## Step 5: Activate the Plugin

1. Log into your WordPress admin
2. Go to **Plugins > Installed Plugins**
3. Find **Live Admin Styler** and click **Activate**
4. Navigate to **Settings > Live Admin Styler** to verify it's working

## Step 6: Verify Installation

Run the verification script:

```bash
# Check if everything is set up correctly
npm run verify-setup
```

This will check:
- PHP version and extensions
- Node.js and npm versions
- Required dependencies
- WordPress connection
- File permissions

## Step 7: Run Tests

Ensure everything is working by running the test suite:

```bash
# Run all tests
npm run test:all

# Run PHP tests only
npm run test:php

# Run JavaScript tests only
npm run test

# Run code quality checks
npm run quality
```

## Development Workflow

### Daily Development

1. **Start development server** (if using one):
   ```bash
   npm run dev:watch
   ```

2. **Make your changes** to PHP or JavaScript files

3. **Test your changes**:
   ```bash
   # Quick test
   npm run test:quick
   
   # Full test suite
   npm run test:all
   ```

4. **Check code quality**:
   ```bash
   npm run lint
   npm run format:check
   ```

### Before Committing

Always run before committing:

```bash
# Pre-commit checks
npm run pre-commit
```

This runs:
- Code linting and formatting
- Unit tests
- Code quality checks

## IDE Setup

### VS Code (Recommended)

Install these extensions:

```bash
# Install VS Code extensions
code --install-extension bmewburn.vscode-intelephense-client
code --install-extension esbenp.prettier-vscode
code --install-extension ms-vscode.vscode-eslint
code --install-extension wordpresstoolbox.wordpress-toolbox
```

**VS Code Settings** (`.vscode/settings.json`):

```json
{
    "php.validate.executablePath": "/usr/bin/php",
    "eslint.workingDirectories": ["./"],
    "prettier.configPath": "./.prettierrc.json",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
        "source.fixAll.eslint": true
    },
    "files.associations": {
        "*.php": "php"
    }
}
```

### PHPStorm

1. **Configure PHP interpreter**:
   - Go to Settings > PHP
   - Set PHP language level to 7.4+
   - Configure CLI interpreter

2. **Install plugins**:
   - WordPress Support
   - PHP Annotations
   - .env files support

3. **Configure code style**:
   - Import WordPress coding standards
   - Set up ESLint integration

## Troubleshooting

### Common Issues

#### "Command not found" errors

```bash
# Make sure global packages are in PATH
echo $PATH

# Reinstall global packages
npm install -g eslint prettier jsdoc
```

#### PHP extension missing

```bash
# Ubuntu/Debian
sudo apt-get install php-mbstring php-xml php-zip

# macOS with Homebrew
brew install php@7.4
```

#### Permission errors

```bash
# Fix file permissions
chmod -R 755 live-admin-styler/
chown -R $USER:$USER live-admin-styler/
```

#### WordPress not detecting plugin

1. Check file permissions
2. Verify plugin header in main file
3. Check for PHP syntax errors:
   ```bash
   php -l live-admin-styler.php
   ```

#### Tests failing

```bash
# Clear caches
npm run clean
composer dump-autoload

# Reinstall dependencies
rm -rf node_modules vendor
npm install
composer install
```

### Getting Help

If you encounter issues:

1. **Check the logs**:
   - WordPress debug log: `wp-content/debug.log`
   - Browser console for JavaScript errors
   - PHP error log

2. **Search existing issues** on GitHub

3. **Ask for help**:
   - Create a GitHub issue
   - Join our Discord/Slack channel
   - Email the development team

## Next Steps

Once your environment is set up:

1. **Read the [Developer Guide](DEVELOPER_GUIDE.md)** for detailed information
2. **Check the [API Documentation](API.md)** for available methods
3. **Look at existing code** to understand patterns
4. **Start with small changes** to get familiar with the codebase
5. **Write tests** for any new functionality

## Useful Commands

### Development

```bash
# Watch for file changes
npm run dev:watch

# Build for development
npm run build

# Build for production
npm run build:production
```

### Testing

```bash
# Run specific test file
npm run test -- --testNamePattern="SettingsManager"
./vendor/bin/phpunit tests/php/TestSettingsManager.php

# Run tests with coverage
npm run test:coverage
npm run test:php:coverage
```

### Code Quality

```bash
# Fix code style automatically
npm run lint:fix
npm run format

# Check for security issues
npm run lint:security
npm audit
```

### Documentation

```bash
# Generate documentation
npm run docs

# Serve documentation locally
npm run docs:serve
```

## Environment Variables

Create a `.env` file in the project root for local configuration:

```env
# WordPress database connection
DB_HOST=localhost
DB_NAME=wordpress
DB_USER=root
DB_PASSWORD=password

# Development settings
LAS_DEBUG=true
WP_DEBUG=true

# API keys (if needed)
SOME_API_KEY=your-api-key-here
```

## Docker Setup (Alternative)

If you prefer Docker:

```bash
# Start the development environment
docker-compose up -d

# Install dependencies inside container
docker-compose exec wordpress composer install
docker-compose exec wordpress npm install

# Run tests
docker-compose exec wordpress npm run test:all
```

**docker-compose.yml**:

```yaml
version: '3.8'

services:
  wordpress:
    image: wordpress:latest
    ports:
      - "8080:80"
    environment:
      WORDPRESS_DB_HOST: db
      WORDPRESS_DB_USER: wordpress
      WORDPRESS_DB_PASSWORD: wordpress
      WORDPRESS_DB_NAME: wordpress
    volumes:
      - .:/var/www/html/wp-content/plugins/live-admin-styler
    depends_on:
      - db

  db:
    image: mysql:5.7
    environment:
      MYSQL_DATABASE: wordpress
      MYSQL_USER: wordpress
      MYSQL_PASSWORD: wordpress
      MYSQL_ROOT_PASSWORD: rootpassword
    volumes:
      - db_data:/var/lib/mysql

volumes:
  db_data:
```

---

## Summary

You should now have:

- ✅ A working development environment
- ✅ All dependencies installed
- ✅ WordPress configured with the plugin
- ✅ Tests passing
- ✅ IDE configured for development

**Ready to start developing!** 🚀

For detailed development information, see the [Developer Guide](DEVELOPER_GUIDE.md).

---

*Live Admin Styler v2.0 - Setup Guide*