# Troubleshooting & FAQ Guide

This comprehensive troubleshooting guide covers common issues, error messages, and solutions for MetaFold. Whether you're experiencing installation problems, integration failures, or performance issues, this guide provides step-by-step solutions to get you back to productive research data management.

![Troubleshooting Overview](images/troubleshooting-overview.png)

## Quick Diagnostic Tools

### Built-in Diagnostic System

MetaFold includes comprehensive diagnostic tools accessible through Settings > Debug:

**System Health Check**
- ✅ **Installation Integrity**: Verify all files are present and correct
- ✅ **Configuration Validation**: Check settings for errors and conflicts
- ✅ **Integration Connectivity**: Test elabFTW and OMERO connections
- ✅ **Security Status**: Verify credential storage and encryption
- ✅ **Performance Metrics**: Monitor memory usage and response times

![System Health Check](images/system-health-check.png)

**Debug Information Export**
- Complete system configuration dump
- Error logs and stack traces
- User activity and usage patterns
- Integration status and error history
- Performance metrics and bottlenecks

**Quick Fix Tools**
- Reset to default settings
- Clear cache and temporary files
- Repair corrupted templates
- Regenerate integration tokens
- Fix file permissions

![Debug Tools](images/debug-tools.png)

### Self-Diagnostic Checklist

Before seeking help, run through this checklist:

**✅ Basic Checks**
- [ ] MetaFold is the latest version
- [ ] Operating system is supported and updated
- [ ] Sufficient disk space available (> 500MB)
- [ ] Network connectivity working
- [ ] No antivirus blocking MetaFold

**✅ Integration Checks**
- [ ] elabFTW server accessible via browser
- [ ] OMERO proxy server running (if using OMERO)
- [ ] API credentials valid and not expired
- [ ] Firewalls allow required connections
- [ ] VPN connected (if required)

**✅ Template and Project Checks**
- [ ] Templates load without errors
- [ ] Project creation path is writable
- [ ] Metadata validation rules are correct
- [ ] No conflicting field names or types

![Self-Diagnostic Checklist](images/self-diagnostic-checklist.png)

## Installation and Startup Issues

### MetaFold Won't Start

**❌ Problem**: Application fails to launch or crashes immediately

**💡 Solutions**:

1. **Check System Requirements**
   ```bash
   # Verify system compatibility
   - Windows 10+ (64-bit)
   - macOS 10.14+ (Mojave or later)
   - Linux Ubuntu 18.04+ or equivalent
   ```

2. **Run as Administrator/Sudo** (temporary test)
   ```bash
   # Windows
   Right-click MetaFold → "Run as administrator"
   
   # macOS/Linux
   sudo /path/to/MetaFold
   ```

3. **Check Error Logs**
   - Windows: `%APPDATA%/MetaFold/logs/`
   - macOS: `~/Library/Application Support/MetaFold/logs/`
   - Linux: `~/.config/MetaFold/logs/`

4. **Reinstall with Clean Install**
   ```bash
   # Backup templates first
   cp -r ~/.config/MetaFold/templates ~/metafold-backup/
   
   # Uninstall completely
   # Reinstall from fresh download
   # Restore templates
   ```

![Startup Issues](images/startup-issues.png)

### White Screen or Loading Forever

**❌ Problem**: MetaFold launches but shows blank screen or endless loading

**💡 Solutions**:

1. **Clear Application Cache**
   ```bash
   # Close MetaFold completely
   # Delete cache directories
   rm -rf ~/.config/MetaFold/cache/
   rm -rf ~/.config/MetaFold/temp/
   ```

2. **Reset User Preferences**
   ```bash
   # Backup current settings
   cp ~/.config/MetaFold/settings.json ~/settings-backup.json
   
   # Delete settings to reset to defaults
   rm ~/.config/MetaFold/settings.json
   ```

3. **Check Graphics Drivers**
   - Update graphics drivers to latest version
   - Disable hardware acceleration if problems persist
   - Test with different display settings

4. **Antivirus Interference**
   - Temporarily disable antivirus
   - Add MetaFold to antivirus exceptions
   - Check if antivirus is blocking file access

### Permission and Access Issues

**❌ Problem**: "Permission denied" errors or cannot create files

**💡 Solutions**:

1. **Fix File Permissions**
   ```bash
   # macOS/Linux
   chmod -R 755 ~/.config/MetaFold/
   chown -R $USER ~/.config/MetaFold/
   
   # Windows (PowerShell as Administrator)
   icacls "C:\Users\%USERNAME%\AppData\Roaming\MetaFold" /grant %USERNAME%:F /T
   ```

2. **Choose Different Project Location**
   - Select project creation path in user directory
   - Avoid system directories or network drives
   - Ensure sufficient disk space available

3. **Run Installation Repair**
   - Use installer's repair option
   - Reinstall with proper administrator privileges
   - Check antivirus quarantine for blocked files

![Permission Issues](images/permission-issues.png)

## Template Management Issues

### Templates Not Loading

**❌ Problem**: Template list is empty or templates fail to load

**💡 Solutions**:

1. **Check Template File Integrity**
   ```bash
   # Navigate to templates directory
   cd ~/.config/MetaFold/templates/
   
   # Check for corrupted JSON files
   for file in *.json; do
     echo "Checking $file"
     cat "$file" | jq . > /dev/null || echo "CORRUPTED: $file"
   done
   ```

2. **Restore Default Templates**
   - Go to Settings > Templates
   - Click "Restore Default Templates"
   - Confirm restoration

3. **Import from Backup**
   ```bash
   # If you have template backups
   cp ~/template-backup/*.json ~/.config/MetaFold/templates/
   ```

4. **Check User Permissions** (Multi-user mode)
   - Verify user has access to shared templates
   - Check group membership and permissions
   - Login as administrator to diagnose

![Template Loading Issues](images/template-loading-issues.png)

### Template Creation Errors

**❌ Problem**: Cannot create or save new templates

**💡 Diagnostic Steps**:

1. **Validate Template Structure**
   ```json
   {
     "id": "unique-template-id",
     "name": "Template Name",
     "type": "experiment",
     "folderStructure": ["folder1", "folder2"],
     "metadata": {
       "field1": {
         "type": "text",
         "required": true
       }
     }
   }
   ```

2. **Check for Duplicate IDs**
   - Ensure template ID is unique
   - Use template manager to identify conflicts
   - Rename conflicting templates

3. **Verify JSON Syntax**
   - Use JSON validator to check syntax
   - Look for missing commas, brackets, or quotes
   - Check field type spellings

4. **Test with Minimal Template**
   - Create simple template with one field
   - Gradually add complexity to identify issues
   - Save frequently during creation

### Metadata Field Issues

**❌ Problem**: Custom metadata fields not working correctly

**💡 Common Field Problems and Solutions**:

**Dropdown Fields Not Populating**
```json
// Incorrect
"sample_type": {
  "type": "dropdown",
  "options": "Cell Culture, Tissue, Blood"  // Wrong format
}

// Correct
"sample_type": {
  "type": "dropdown",
  "options": ["Cell Culture", "Tissue", "Blood"]  // Array format
}
```

**Conditional Fields Not Appearing**
```json
// Check condition syntax
"cell_line": {
  "type": "text",
  "condition": {
    "field": "sample_type",
    "operator": "equals",
    "value": "Cell Culture"
  }
}
```

**Date Fields Not Validating**
```json
// Ensure proper date format
"experiment_date": {
  "type": "date",
  "format": "YYYY-MM-DD",
  "validation": {
    "min": "2020-01-01",
    "max": "today"
  }
}
```

![Metadata Field Issues](images/metadata-field-issues.png)

## Integration Problems

### elabFTW Integration Issues

**❌ Problem**: Cannot connect to elabFTW or experiments not created

**💡 Diagnostic Process**:

1. **Test Connection Manually**
   ```bash
   # Test API connectivity
   curl -H "Authorization: Bearer YOUR_API_KEY" \
        https://your-elabftw-server.com/api/v2/experiments
   ```

2. **Verify API Key**
   - Login to elabFTW web interface
   - Check API key permissions and expiration
   - Generate new API key if needed
   - Ensure key has write permissions

3. **Check Server URL**
   ```
   ✅ Correct: https://elabftw.example.com
   ❌ Wrong: elabftw.example.com (missing https://)
   ❌ Wrong: https://elabftw.example.com/ (trailing slash)
   ```

4. **Firewall and Network Issues**
   - Test server accessibility from browser
   - Check corporate firewall rules
   - Verify VPN connection if required
   - Try different network connection

![elabFTW Integration Issues](images/elabftw-integration-issues.png)

**❌ Problem**: Experiments created but metadata missing

**💡 Solutions**:

1. **Check Field Mapping**
   - Verify metadata field names don't contain special characters
   - Check for reserved elabFTW field names
   - Use alphanumeric field names only

2. **Validate Metadata Content**
   - Ensure all required fields are completed
   - Check for null or empty values
   - Verify data types match expectations

3. **Test with Minimal Metadata**
   - Create project with only title and description
   - Gradually add fields to identify problematic metadata

### OMERO Integration Issues

**❌ Problem**: OMERO proxy server not starting

**💡 Solutions**:

1. **Check Python Installation**
   ```bash
   # Verify Python version
   python --version  # Should be 3.7+
   
   # Check required packages
   pip list | grep -E "(requests|flask|flask-cors)"
   
   # Install missing packages
   pip install requests flask flask-cors
   ```

2. **Port Conflicts**
   ```bash
   # Check if port 8000 is in use
   netstat -tulpn | grep :8000
   
   # Use different port
   python omero_proxy.py --port 8001
   ```

3. **Firewall Issues**
   ```bash
   # Allow port through firewall (Linux)
   sudo ufw allow 8000
   
   # Windows: Add firewall exception for Python
   ```

![OMERO Proxy Issues](images/omero-proxy-issues.png)

**❌ Problem**: OMERO authentication failing

**💡 Diagnostic Steps**:

1. **Test Direct Login**
   - Try logging into OMERO.web directly
   - Verify username and password
   - Check account status and permissions

2. **Check Proxy Configuration**
   ```bash
   # Start proxy with debug output
   python omero_proxy.py --debug --omero-server https://your-omero-server.com
   ```

3. **Verify Server URL**
   ```
   ✅ Correct: https://omero.example.com
   ❌ Wrong: https://omero.example.com:4064 (don't include port)
   ```

4. **Group Permissions**
   - Verify user belongs to at least one OMERO group
   - Check dataset creation permissions
   - Contact OMERO administrator if needed

**❌ Problem**: Datasets created but no map annotations

**💡 Solutions**:

1. **Check Annotation Permissions**
   - Verify user can create annotations in OMERO
   - Check group annotation policies
   - Test annotation creation manually in OMERO.web

2. **Validate Metadata Structure**
   - Ensure metadata fields have simple names (no spaces or special characters)
   - Check for very long field values (OMERO has limits)
   - Test with minimal metadata first

3. **Monitor Proxy Logs**
   ```bash
   # Check proxy output for annotation errors
   python omero_proxy.py --debug
   ```

## Project Creation Problems

### Project Creation Fails

**❌ Problem**: "Project creation failed" error message

**💡 Systematic Diagnosis**:

1. **Check Project Path**
   ```bash
   # Verify path exists and is writable
   ls -la /path/to/project/location/
   touch /path/to/project/location/test.txt
   rm /path/to/project/location/test.txt
   ```

2. **Validate Template**
   - Use template validator in Settings > Debug
   - Check for corrupted template JSON
   - Test with known-good template

3. **Review Metadata Form**
   - Ensure all required fields are completed
   - Check for invalid characters in field values
   - Validate date formats and numeric fields

4. **Check Integration Settings**
   - Disable integrations temporarily
   - Test basic project creation first
   - Add integrations back one at a time

![Project Creation Problems](images/project-creation-problems.png)

### Folder Structure Issues

**❌ Problem**: Folders not created or incorrect structure

**💡 Solutions**:

1. **Check Folder Path Syntax**
   ```json
   // Correct folder structure syntax
   "folderStructure": [
     "data",
     "data/raw",
     "data/processed",
     "analysis",
     "results"
   ]
   ```

2. **Validate Path Characters**
   - Avoid special characters: `< > : " | ? * \`
   - Use forward slashes for nested folders
   - Keep folder names short and descriptive

3. **Check Disk Space**
   ```bash
   # Check available space
   df -h /path/to/project/location/
   ```

4. **Test Folder Creation Manually**
   ```bash
   # Test if you can create folders manually
   mkdir -p /path/to/project/test-folder/subfolder
   ```

### Metadata File Problems

**❌ Problem**: `elabftw-metadata.json` file not created or corrupted

**💡 Diagnosis and Repair**:

1. **Check File Creation**
   ```bash
   # Look for metadata file in project directory
   ls -la /path/to/project/elabftw-metadata.json
   ```

2. **Validate JSON Structure**
   ```bash
   # Test JSON validity
   cat elabftw-metadata.json | jq .
   ```

3. **Check File Permissions**
   ```bash
   # Verify file is readable
   ls -la elabftw-metadata.json
   chmod 644 elabftw-metadata.json
   ```

4. **Regenerate Metadata File**
   - Use Project Scanner to find projects with missing metadata
   - Use "Repair Project" function if available
   - Manually recreate metadata file from template

![Metadata File Problems](images/metadata-file-problems.png)

## Project Scanner Issues

### Scanner Not Finding Projects

**❌ Problem**: Project Scanner returns zero results despite having MetaFold projects

**💡 Diagnostic Steps**:

1. **Check Scan Path**
   - Verify you're scanning the correct directory
   - Ensure path contains MetaFold projects
   - Try scanning a known project directory first

2. **Verify Project Structure**
   ```bash
   # MetaFold projects must contain:
   find /scan/path -name "elabftw-metadata.json" -type f
   ```

3. **Check Scan Depth**
   - Increase maximum scan depth if projects are deeply nested
   - Default depth is 5 levels
   - Very deep structures may need higher limits

4. **File Permissions**
   ```bash
   # Ensure scanner can read directories
   find /scan/path -type d ! -readable
   ```

![Scanner Not Finding Projects](images/scanner-not-finding-projects.png)

### Scanner Performance Issues

**❌ Problem**: Project Scanner is very slow or never completes

**💡 Optimization Strategies**:

1. **Reduce Scan Scope**
   - Scan smaller directory subsets
   - Exclude large irrelevant directories
   - Use filters to limit scan scope

2. **Check System Resources**
   ```bash
   # Monitor CPU and memory usage
   top -p $(pgrep MetaFold)
   
   # Check disk I/O
   iotop -p $(pgrep MetaFold)
   ```

3. **Optimize Scan Settings**
   - Enable "Fast Scan" mode for initial discovery
   - Reduce concurrent scanning threads
   - Use incremental scanning for large datasets

4. **Exclude Problem Directories**
   ```bash
   # Common directories to exclude:
   - System directories (/System, /Windows)
   - Backup directories
   - Very large data directories
   - Network mounted drives
   ```

### Scanner Data Issues

**❌ Problem**: Scanner finds projects but metadata is incorrect or incomplete

**💡 Data Validation**:

1. **Check Metadata File Quality**
   ```bash
   # Validate all found metadata files
   find /scan/path -name "elabftw-metadata.json" -exec jq . {} \;
   ```

2. **Identify Corrupted Files**
   ```bash
   # Find invalid JSON files
   find /scan/path -name "elabftw-metadata.json" -exec sh -c 'jq . "$1" >/dev/null 2>&1 || echo "Corrupted: $1"' _ {} \;
   ```

3. **Repair Corrupted Metadata**
   - Use JSON repair tools for minor corruption
   - Recreate metadata from template information
   - Use Project Scanner repair functions

4. **Verify Template Compatibility**
   - Check if scanned projects use obsolete template formats
   - Update templates to current format
   - Migrate old projects to new templates

![Scanner Data Issues](images/scanner-data-issues.png)

## Visualization Problems

### Visualizations Not Loading

**❌ Problem**: Visualization tab shows empty screen or loading errors

**💡 Solutions**:

1. **Check Data Source**
   - Ensure you've selected a valid data source
   - Verify Project Scanner has been run successfully
   - Check that templates exist and are valid

2. **Browser Compatibility**
   - Update browser to latest version
   - Enable JavaScript and WebGL
   - Clear browser cache and cookies
   - Try different browser

3. **Data Size Limits**
   ```javascript
   // Large datasets may cause issues
   // Try filtering data to smaller subset
   // Enable data sampling for initial view
   ```

4. **Check Console Errors**
   ```javascript
   // Open browser developer tools (F12)
   // Look for JavaScript errors in console
   // Report errors for debugging
   ```

![Visualization Loading Issues](images/visualization-loading-issues.png)

### Poor Visualization Performance

**❌ Problem**: Visualizations are slow, laggy, or unresponsive

**💡 Performance Optimization**:

1. **Reduce Dataset Size**
   - Apply filters to show fewer projects
   - Use sampling for large datasets
   - Focus on specific time periods or templates

2. **Optimize Browser Performance**
   - Close other browser tabs
   - Increase browser memory allocation
   - Disable browser extensions temporarily

3. **Adjust Visualization Settings**
   - Reduce animation complexity
   - Use simpler layout algorithms
   - Lower rendering quality temporarily

4. **System Resource Check**
   ```bash
   # Monitor system resources during visualization
   htop  # or Activity Monitor on macOS
   ```

## User Management Issues

### Login Problems

**❌ Problem**: Cannot login or user authentication fails

**💡 Solutions**:

1. **Verify User Account Exists**
   - Check username spelling and case
   - Verify account hasn't been disabled
   - Contact administrator if necessary

2. **Password Issues**
   - Try password reset if available
   - Check caps lock and keyboard layout
   - Verify password meets requirements

3. **Multi-User Mode Configuration**
   ```bash
   # Check if multi-user mode is properly enabled
   # Look for user database file
   ls -la ~/.config/MetaFold/users.json
   ```

4. **Switch to Simple Mode Temporarily**
   - Disable multi-user mode for testing
   - Check if issue persists in simple mode
   - Re-enable after troubleshooting

![Login Problems](images/login-problems.png)

### Template Sharing Issues

**❌ Problem**: Shared templates not appearing for users

**💡 Diagnosis**:

1. **Check Sharing Configuration**
   - Verify templates are actually shared
   - Check recipient user permissions
   - Verify group memberships

2. **Template Sync Issues**
   - Force template library refresh
   - Check for template conflicts
   - Verify template file permissions

3. **User Permission Problems**
   - Check user type and permissions
   - Verify group access settings
   - Contact administrator for permission review

## Security and Credential Issues

### Credential Storage Problems

**❌ Problem**: Integration credentials not saving or being lost

**💡 Solutions**:

1. **Check Encryption Backend**
   - Go to Settings > Security
   - Check current encryption status
   - Upgrade to better encryption if available

2. **Test Credential Storage**
   ```bash
   # Use built-in security test tools
   # Try storing and retrieving test credentials
   ```

3. **Clear and Re-enter Credentials**
   - Delete all stored credentials
   - Re-enter credentials one by one
   - Test each integration separately

4. **Check System Keychain**
   ```bash
   # macOS: Check Keychain Access app
   # Windows: Check Credential Manager
   # Linux: Check keyring status
   ```

![Credential Storage Problems](images/credential-storage-problems.png)

### Security Warnings

**❌ Problem**: Security warnings or encryption failures

**💡 Response Actions**:

1. **Assess Security Status**
   - Review security dashboard warnings
   - Identify specific security issues
   - Prioritize critical security problems

2. **Upgrade Security**
   - Migrate to stronger encryption if available
   - Update to latest MetaFold version
   - Follow security recommendations

3. **Emergency Procedures**
   - Change all integration passwords immediately
   - Revoke and regenerate API keys
   - Audit recent access and activities

## Performance and Resource Issues

### High Memory Usage

**❌ Problem**: MetaFold using excessive memory or causing system slowdown

**💡 Memory Optimization**:

1. **Monitor Memory Usage**
   ```bash
   # Check MetaFold memory usage
   ps aux | grep MetaFold
   top -p $(pgrep MetaFold)
   ```

2. **Reduce Memory Load**
   - Close large visualizations
   - Limit Project Scanner scope
   - Clear application cache
   - Restart MetaFold periodically

3. **System Optimization**
   ```bash
   # Increase system memory if possible
   # Close other memory-intensive applications
   # Check for memory leaks in error logs
   ```

4. **Data Management**
   - Archive old projects and templates
   - Clean up temporary files
   - Optimize database files

![Memory Usage Issues](images/memory-usage-issues.png)

### Slow Response Times

**❌ Problem**: MetaFold is sluggish or unresponsive

**💡 Performance Tuning**:

1. **Identify Bottlenecks**
   - Check CPU usage patterns
   - Monitor disk I/O activity
   - Test network connectivity speed

2. **Application Optimization**
   - Clear cache and temporary files
   - Reduce concurrent operations
   - Optimize template complexity

3. **System Optimization**
   ```bash
   # Check available disk space
   df -h
   
   # Monitor system performance
   sar -u 1 10  # CPU usage
   sar -d 1 10  # Disk I/O
   ```

4. **Network Optimization**
   - Test integration server response times
   - Check for network congestion
   - Consider local caching

## Common Error Messages

### "Failed to create project directory"

**💡 Quick Fix**:
1. Check write permissions on target directory
2. Ensure sufficient disk space
3. Choose different project location
4. Run MetaFold with elevated privileges (temporarily)

### "Template validation failed"

**💡 Quick Fix**:
1. Use template validator in Settings > Debug
2. Check JSON syntax with online validator
3. Compare with working template
4. Restore from backup or recreate

### "Integration authentication failed"

**💡 Quick Fix**:
1. Test credentials in web browser
2. Check API key expiration
3. Verify server URL format
4. Check network connectivity

### "Metadata schema error"

**💡 Quick Fix**:
1. Validate metadata field definitions
2. Check for conflicting field names
3. Verify field type specifications
4. Test with minimal metadata

![Common Error Messages](images/common-error-messages.png)

## Getting Help and Support

### Before Contacting Support

**Prepare This Information**:
- MetaFold version and operating system
- Complete error messages and screenshots
- Steps to reproduce the problem
- System configuration and integration details
- Debug information from Settings > Debug

### Support Channels

**Self-Help Resources**:
- Documentation and user guides
- FAQ section and knowledge base
- Community forums and discussions
- Video tutorials and walkthroughs

**Direct Support**:
- Email support with debug information
- Community forum for peer assistance
- Professional support for enterprise users
- Emergency support for critical issues

**Community Contribution**:
- Report bugs and suggest improvements
- Share solutions and workarounds
- Contribute to documentation
- Help other users in forums

![Support Channels](images/support-channels.png)

### Escalation Process

**Level 1: Self-Service**
- Use diagnostic tools and this guide
- Check documentation and FAQ
- Search community forums

**Level 2: Community Support**
- Post in community forums
- Seek help from other users
- Share problem details and solutions

**Level 3: Professional Support**
- Contact support team with debug info
- Provide detailed problem description
- Follow support team guidance

**Level 4: Development Team**
- Complex bugs requiring code fixes
- Feature requests and enhancements
- Security vulnerabilities

## Preventive Maintenance

### Regular Maintenance Tasks

**Weekly Tasks**:
- Check for MetaFold updates
- Review security status
- Test integration connectivity
- Clean temporary files

**Monthly Tasks**:
- Backup templates and important data
- Review and organize template library
- Check system performance metrics
- Update integration credentials if needed

**Quarterly Tasks**:
- Full system security audit
- Performance optimization review
- Template usage analysis
- User training and education updates

![Preventive Maintenance](images/preventive-maintenance.png)

### Health Monitoring

**Automated Monitoring**:
- Set up health check schedules
- Configure alerting for critical issues
- Monitor integration service status
- Track performance trends

**Manual Checks**:
- Regular functionality testing
- User experience assessment
- Security configuration review
- Backup and recovery testing

## Recovery Procedures

### Data Recovery

**Template Recovery**:
1. Check automatic backups in `~/.config/MetaFold/backups/`
2. Restore from manual backups
3. Recreate from documentation
4. Import from other users or systems

**Project Recovery**:
1. Restore from file system backups
2. Recover metadata from integration systems
3. Recreate project structure manually
4. Use Project Scanner to rediscover existing projects

**Settings Recovery**:
1. Reset to default settings
2. Restore from backup configuration
3. Reconfigure integrations manually
4. Import settings from other installations

![Recovery Procedures](images/recovery-procedures.png)

### Disaster Recovery

**Complete System Failure**:
1. Fresh MetaFold installation
2. Restore user data from backups
3. Reconfigure all integrations
4. Verify system functionality

**Data Corruption**:
1. Identify scope of corruption
2. Restore uncorrupted backups
3. Repair salvageable data
4. Document lessons learned

**Security Incidents**:
1. Immediate credential rotation
2. System security audit
3. Incident investigation
4. Security improvement implementation

---

*This troubleshooting guide covers the most common issues and solutions. For complex problems or issues not covered here, don't hesitate to contact support with detailed diagnostic information.*