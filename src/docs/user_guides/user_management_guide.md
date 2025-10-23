# User Management

MetaFold's user management system enables teams to work together efficiently while maintaining individual workspaces and template libraries. Whether you're a small research group or a large laboratory, the user management features help organize templates, share resources, and maintain consistent data organization across team members.

![User Management Overview](images/user-management-overview.png)

## User Management Modes

### Simple Mode (Default)

**Best For**: Individual researchers or small, informal teams

**Features**:
- Single user operation
- All templates accessible to everyone using the computer
- Simplified interface without user switching
- No login requirements
- Shared template library

![Simple Mode Interface](images/simple-mode-interface.png)

### Multi-User Mode

**Best For**: Research teams, shared computers, laboratory environments

**Features**:
- Individual user accounts with separate template libraries
- User-specific settings and preferences
- Template sharing and collaboration options
- User switching with login system
- Group-based access control
- Administrative oversight and management

![Multi-User Mode Interface](images/multi-user-mode-interface.png)

## Enabling Multi-User Mode

### Activation Process

1. **Open Settings**
   - Navigate to **⚙️ Settings** tab
   - Look for **"User Management"** section

   ![User Management Settings](images/user-management-settings.png)

2. **Enable Multi-User Mode**
   - Toggle **"Enable User Management"** switch
   - Confirm activation in dialog box
   - MetaFold will restart to apply changes

   ![Enable Multi-User](images/enable-multi-user.png)

3. **Create Administrator Account**
   - First launch after enabling shows admin setup
   - Enter administrator username and details
   - Set administrative password (optional but recommended)
   - Configure default settings for new users

   ![Admin Setup](images/admin-setup.png)

4. **Login Interface Appears**
   - MetaFold now shows user login on startup
   - Administrator can access user management features
   - Standard users see simplified interface

### Migration from Simple Mode

When enabling multi-user mode, MetaFold handles the transition automatically:

**Template Migration**:
- Existing templates become available to all users
- Option to assign templates to specific users
- Backup of original template library created

**Settings Preservation**:
- Current settings become default for new users
- Integration credentials transferred to administrator
- User preferences reset to defaults

**Data Protection**:
- No existing projects are modified
- All metadata files remain unchanged
- Integration links continue working

![Migration Process](images/migration-process.png)

## User Management Interface

### Admin Dashboard

Administrators access additional features through the enhanced Settings interface:

**User Administration Panel**:
- View all registered users
- Create and delete user accounts
- Modify user permissions and groups
- Monitor user activity and template usage

**Template Management**:
- Global template library administration
- Template sharing configuration
- Version control and updates
- Usage statistics and analytics

**System Configuration**:
- Default settings for new users
- Integration credentials management
- Security policy configuration
- Backup and maintenance options

![Admin Dashboard](images/admin-dashboard.png)

### User Login System

**Login Process**:
1. **Start MetaFold** - Login screen appears
2. **Select or Enter Username** - Autocomplete from existing users
3. **Enter Password** (if required) - Optional security layer
4. **Access Personal Workspace** - User-specific templates and settings

**User Selection Features**:
- **Autocomplete**: Suggests usernames as you type
- **Recent Users**: Quick access to frequently used accounts
- **Group Filtering**: Show only users from specific research groups
- **Guest Access**: Temporary accounts for visitors or collaborators

![User Login Interface](images/user-login-interface.png)

## Creating and Managing Users

### Adding New Users

**Method 1: Administrator Creation**

1. **Access User Management**
   - Login as administrator
   - Go to Settings > User Management
   - Click **"Add New User"**

   ![Add New User Button](images/add-new-user-button.png)

2. **Enter User Details**
   - **Username**: Unique identifier (no spaces, alphanumeric)
   - **Display Name**: Full name for interface display
   - **Email**: Contact email for notifications (optional)
   - **Research Group**: Organizational affiliation
   - **User Type**: Standard User, Administrator, or Guest

   ![User Details Form](images/user-details-form.png)

3. **Configure Permissions**
   - **Template Access**: Which templates user can see and modify
   - **Integration Access**: elabFTW and OMERO credential usage
   - **Administrative Rights**: User management capabilities
   - **Data Access**: Project creation and scanner permissions

4. **Set Initial Configuration**
   - **Default Templates**: Templates available immediately
   - **Integration Settings**: Inherit from administrator or custom
   - **Workspace Setup**: Default paths and preferences

   ![User Configuration](images/user-configuration.png)

**Method 2: Self-Registration**

1. **Enable Self-Registration** in admin settings
2. **Users click "Create New Account"** on login screen
3. **Fill Registration Form** with basic information
4. **Administrator Approval** (if required)
5. **Account Activation** and initial setup

![Self-Registration Process](images/self-registration-process.png)

### User Types and Permissions

**Standard User**:
- ✅ Create and modify personal templates
- ✅ Create projects using available templates
- ✅ Access shared templates (read-only)
- ✅ Use configured integrations
- ❌ User management functions
- ❌ System-wide settings modification

**Administrator**:
- ✅ All standard user permissions
- ✅ Create, modify, and delete user accounts
- ✅ Manage global template library
- ✅ Configure system settings and integrations
- ✅ Access usage analytics and reports
- ✅ Backup and maintenance operations

**Guest User**:
- ✅ Limited template access (guest templates only)
- ✅ Project creation with restrictions
- ❌ Template modification
- ❌ Integration access
- ❌ Persistent settings storage
- ⏰ Time-limited access (configurable)

**Research Group Leader**:
- ✅ All standard user permissions
- ✅ Manage users within their research group
- ✅ Share templates within group
- ✅ Group-level analytics and reporting
- ❌ System-wide administrative access

![User Permissions Matrix](images/user-permissions-matrix.png)

## Template Sharing and Collaboration

### Template Ownership and Sharing

**Personal Templates**:
- Created by individual users
- Private by default
- Can be shared with specific users or groups
- Original creator retains ownership and control

**Shared Templates**:
- Made available to multiple users
- Read-only access for non-owners
- Can be copied and modified by users
- Usage tracked across all users

**Global Templates**:
- Available to all users system-wide
- Managed by administrators
- High-quality, well-tested templates
- Serve as institutional standards

![Template Sharing Hierarchy](images/template-sharing-hierarchy.png)

### Sharing Workflows

**Share Personal Template**:

1. **Open Template Manager**
   - Navigate to Templates tab
   - Find template to share

2. **Access Sharing Options**
   - Click template menu (three dots)
   - Select **"Share Template"**

   ![Template Sharing Menu](images/template-sharing-menu.png)

3. **Configure Sharing**
   - **Share With**: Select specific users or groups
   - **Permission Level**: Read-only or allow copying
   - **Duration**: Permanent or time-limited sharing
   - **Notification**: Alert recipients about new template

   ![Template Sharing Configuration](images/template-sharing-configuration.png)

4. **Confirm and Notify**
   - Review sharing settings
   - Send notifications to recipients
   - Track sharing status and usage

**Receive Shared Template**:

1. **Notification**: User receives sharing notification
2. **Review Template**: Preview template structure and metadata
3. **Accept or Decline**: Choose whether to add to personal library
4. **Copy and Customize**: Create personal version if needed

![Receive Shared Template](images/receive-shared-template.png)

### Collaborative Template Development

**Version Control**:
- Track template changes over time
- See who made modifications and when
- Revert to previous versions if needed
- Merge improvements from different users

**Collaborative Editing**:
- Multiple users can suggest improvements
- Comment system for template feedback
- Approval workflow for template updates
- Integration with team communication tools

**Template Reviews**:
- Peer review process for quality assurance
- Testing workflows before wide deployment
- Feedback collection from template users
- Continuous improvement based on usage data

![Collaborative Template Development](images/collaborative-template-development.png)

## Group Management

### Research Groups

**Purpose**: Organize users by research affiliation, project, or collaboration

**Features**:
- Group-specific template libraries
- Shared integration credentials
- Group-level usage analytics
- Collaborative project management

**Common Group Types**:
- **Laboratory Groups**: All members of a research lab
- **Project Teams**: Collaborators on specific research projects
- **Department Divisions**: Organizational units within institutions
- **External Collaborations**: Cross-institutional research partnerships

![Research Groups](images/research-groups.png)

### Creating and Managing Groups

**Create New Group**:

1. **Administrator Access**: Login as administrator
2. **Group Management**: Go to Settings > Groups
3. **Add Group**: Click "Create New Group"
4. **Group Details**:
   - **Group Name**: Descriptive identifier
   - **Description**: Purpose and scope
   - **Group Leader**: Responsible user (optional)
   - **Access Level**: Public, private, or invitation-only

   ![Create New Group](images/create-new-group.png)

**Manage Group Membership**:
- **Add Members**: Invite users to join group
- **Remove Members**: Handle departing team members
- **Role Assignment**: Designate group leaders and coordinators
- **Permission Management**: Control access to group resources

**Group Resources**:
- **Shared Templates**: Templates available to all group members
- **Integration Credentials**: Shared elabFTW/OMERO access
- **Project Directories**: Common file storage locations
- **Documentation**: Group-specific guidelines and protocols

![Group Management Interface](images/group-management-interface.png)

## Advanced User Management

### User Profiles and Preferences

**Personal Profile**:
- Display name and contact information
- Research interests and expertise
- ORCID and other researcher identifiers
- Profile picture and bio (optional)

**Workspace Preferences**:
- Default project creation paths
- Preferred template types and layouts
- Integration settings and credentials
- Interface customization options

**Notification Settings**:
- Template sharing alerts
- System update notifications
- Integration status messages
- Collaboration invitations

![User Profile Interface](images/user-profile-interface.png)

### Single Sign-On (SSO) Integration

**Institutional Authentication**:
- LDAP/Active Directory integration
- SAML-based authentication
- OAuth2 with institutional providers
- Multi-factor authentication support

**Benefits**:
- Seamless integration with institutional systems
- Centralized user management
- Enhanced security through institutional policies
- Reduced password management burden

**Setup Requirements**:
- Administrator configuration of SSO provider
- Institutional IT department coordination
- Testing with pilot user groups
- Migration planning for existing accounts

![SSO Integration](images/sso-integration.png)

### User Analytics and Reporting

**Individual User Metrics**:
- Template creation and usage statistics
- Project creation frequency and success rates
- Integration adoption and usage patterns
- Login frequency and session duration

**Group Analytics**:
- Collaboration patterns within groups
- Template sharing and adoption rates
- Group productivity and activity levels
- Resource usage and requirements

**System-Wide Reports**:
- Total user adoption and growth
- Most popular templates and features
- Integration usage across all users
- System performance and capacity planning

![User Analytics Dashboard](images/user-analytics-dashboard.png)

## Security and Access Control

### User Authentication

**Password Policies**:
- Minimum password complexity requirements
- Password expiration and rotation policies
- Account lockout after failed attempts
- Password recovery and reset procedures

**Session Management**:
- Automatic logout after inactivity
- Concurrent session limits
- Session token security
- Secure credential storage

![Authentication Security](images/authentication-security.png)

### Data Protection

**User Data Isolation**:
- Separate template libraries for each user
- Private settings and preferences
- Secure storage of personal information
- Data encryption for sensitive information

**Access Logging**:
- Track user login and logout events
- Monitor template access and modifications
- Log administrative actions and changes
- Audit trail for security investigations

**Backup and Recovery**:
- Regular backups of user data and templates
- Individual user data recovery options
- System-wide restore capabilities
- Data export for user migration

## Migration and Deployment

### Institutional Deployment

**Planning Phase**:
1. **User Requirements Analysis**: Survey potential users and use cases
2. **Technical Assessment**: Evaluate system requirements and infrastructure
3. **Pilot Program**: Test with small group of early adopters
4. **Training Development**: Create user training materials and programs
5. **Rollout Strategy**: Plan phased deployment across institution

**Implementation Steps**:
1. **System Setup**: Install and configure MetaFold with user management
2. **User Account Creation**: Bulk import or individual account setup
3. **Template Library**: Establish initial shared templates
4. **Integration Configuration**: Set up elabFTW and OMERO connections
5. **Training and Support**: Provide user training and ongoing support

![Institutional Deployment](images/institutional-deployment.png)

### Migration from Other Systems

**From Individual MetaFold Installations**:
- Export templates from individual installations
- Import into centralized multi-user system
- Preserve user work and customizations
- Establish user accounts and permissions

**From Other Research Data Management Tools**:
- Template translation from other formats
- Metadata mapping and conversion
- User account migration strategies
- Training for new interface and workflows

**Data Preservation**:
- Maintain access to historical projects
- Preserve integration links and references
- Document migration process and changes
- Provide rollback options if needed

## Troubleshooting User Management

### Common Issues

**❌ Users Cannot Login**

*Symptoms*: Login screen appears but users cannot access accounts

*Solutions*:
- Verify user accounts exist and are active
- Check password requirements and policies
- Ensure user management mode is properly enabled
- Review error logs for authentication failures

**❌ Templates Not Sharing Properly**

*Symptoms*: Shared templates don't appear for intended users

*Solutions*:
- Check sharing permissions and user group memberships
- Verify template sharing configuration
- Refresh user template libraries
- Review group access settings

**❌ Performance Issues with Many Users**

*Symptoms*: Slow response times or system crashes with multiple users

*Solutions*:
- Monitor system resource usage
- Optimize database performance
- Consider hardware upgrades
- Implement user activity limits

**❌ Integration Credentials Not Working**

*Symptoms*: Users cannot access elabFTW or OMERO integrations

*Solutions*:
- Verify integration credentials are properly shared
- Check user permissions for integration access
- Test credentials with administrator account
- Review integration configuration settings

![User Management Troubleshooting](images/user-management-troubleshooting.png)

### Administrative Tools

**User Diagnostics**:
- Check user account status and permissions
- Review user activity logs and error messages
- Test user login and template access
- Verify integration connectivity

**System Health Monitoring**:
- Monitor user session counts and duration
- Track template usage and sharing patterns
- Check system resource utilization
- Review backup and data integrity status

**Maintenance Tasks**:
- Regular user account cleanup and deactivation
- Template library organization and optimization
- System updates and security patches
- Performance tuning and capacity planning

## Best Practices

### User Management Strategy

**Account Lifecycle Management**:
- Standardized account creation and activation process
- Regular review and cleanup of inactive accounts
- Smooth offboarding process for departing users
- Clear policies for account suspension and reactivation

**Template Library Governance**:
- Quality standards for shared templates
- Review and approval process for global templates
- Regular cleanup of unused or outdated templates
- Documentation and training for template creation

**Security Management**:
- Regular security audits and assessments
- User training on security best practices
- Monitoring and response to security incidents
- Compliance with institutional security policies

![User Management Best Practices](images/user-management-best-practices.png)

### Team Collaboration Guidelines

**Template Sharing Etiquette**:
- Clear naming conventions for shared templates
- Descriptive documentation for template purpose and usage
- Responsible sharing with appropriate user groups
- Regular review and updating of shared templates

**Communication and Coordination**:
- Regular team meetings to discuss template usage and improvements
- Feedback channels for user suggestions and issues
- Coordination with IT support for technical issues
- Integration with existing team communication tools

**Training and Support**:
- Onboarding process for new team members
- Regular training sessions on new features and best practices
- Documentation and help resources for common tasks
- Peer support and mentoring programs

## Future Enhancements

### Planned Features

**Enhanced Collaboration**:
- Real-time collaborative template editing
- Discussion forums for user communities
- Integration with project management tools
- Advanced workflow automation

**Improved Analytics**:
- Machine learning-based usage pattern analysis
- Predictive analytics for template recommendations
- Advanced reporting and dashboard capabilities
- Integration with institutional research information systems

**Mobile and Remote Access**:
- Mobile applications for user management
- Enhanced remote access and VPN integration
- Offline capabilities for disconnected environments
- Cloud-based deployment options

**Integration Expansion**:
- Additional authentication providers and SSO options
- Integration with more research data management tools
- Enhanced API for custom integrations
- Workflow integration with laboratory information systems

## Next Steps

Now that you understand user management:

- **[Learn Security Features](security.md)** for protecting user data and credentials
- **[Explore Advanced Features](advanced-features.md)** for power users and administrators
- **[Review Troubleshooting Guide](troubleshooting.md)** for comprehensive problem-solving
- **[Integration Workflows](combined-integrations.md)** with team-based user management

---

*Effective user management transforms MetaFold from an individual tool into a powerful platform for team-based research data organization!*