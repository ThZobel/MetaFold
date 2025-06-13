# Security & Credential Management

MetaFold implements comprehensive security measures to protect your research data, credentials, and personal information. From multi-layer encryption for sensitive data to secure integration with laboratory systems, the security features ensure your research remains protected while maintaining usability and collaboration capabilities.

![Security Overview](images/security-overview.png)

## Security Architecture

### Multi-Layer Protection

MetaFold employs a defense-in-depth approach with multiple security layers:

**🔐 Layer 1: Operating System Integration**
- Native keychain services (macOS Keychain, Windows Credential Manager, Linux Secret Service)
- OS-level encryption and access controls
- Hardware security module support where available
- Secure boot and trusted platform modules

**🔒 Layer 2: Application-Level Encryption**
- AES-256-GCM encryption for sensitive data
- Key derivation using PBKDF2 with high iteration counts
- Secure random number generation
- Memory protection for cryptographic operations

**🛡️ Layer 3: Network Security**
- TLS 1.3 for all external communications
- Certificate validation and pinning
- Secure proxy servers for API communications
- Network isolation and firewall integration

**👤 Layer 4: User Access Control**
- Multi-user authentication and authorization
- Role-based permissions and access control
- Session management and timeout policies
- Audit logging and monitoring

![Security Layers](images/security-layers.png)

### Threat Model

MetaFold security design addresses these primary threats:

**Data Confidentiality**:
- Unauthorized access to research data and metadata
- Credential theft and misuse
- Network eavesdropping and interception
- Physical device compromise

**Data Integrity**:
- Tampering with project metadata
- Unauthorized modification of templates
- Corruption of integration credentials
- Malicious code injection attempts

**Availability**:
- Service disruption and denial of access
- System compromise and malware infection
- Data loss and corruption
- Integration service dependencies

**Privacy**:
- User activity tracking and profiling
- Unauthorized access to personal information
- Cross-user data leakage
- Institutional policy compliance

## Credential Security System

### Secure Storage Implementation

**Primary Storage: OS Native Keychain**

MetaFold leverages operating system keychain services as the primary credential storage:

**macOS Keychain**:
- Integration with macOS Keychain Services
- Hardware encryption on devices with Secure Enclave
- Touch ID and Face ID support for authentication
- Automatic synchronization with iCloud Keychain (optional)

**Windows Credential Manager**:
- Windows Credential Manager API integration
- DPAPI (Data Protection API) encryption
- Windows Hello biometric authentication support
- Group policy integration for enterprise environments

**Linux Secret Service**:
- freedesktop.org Secret Service API
- Integration with GNOME Keyring and KDE Wallet
- Support for hardware security modules
- SSH agent integration where available

![OS Keychain Integration](images/os-keychain-integration.png)

**Secondary Storage: Browser Crypto API**

When OS keychain is unavailable, MetaFold falls back to browser-based encryption:

**Encryption Specifications**:
- AES-256-GCM with 256-bit keys
- PBKDF2 key derivation with 100,000+ iterations
- Cryptographically secure random salt generation
- Authenticated encryption preventing tampering

**Implementation Details**:
- Web Crypto API for cryptographic operations
- IndexedDB for encrypted credential storage
- Memory-safe key handling practices
- Automatic key rotation and updates

**Fallback Storage: Obfuscated Local Storage**

As a last resort, MetaFold provides obfuscated storage:

**Obfuscation Techniques**:
- Base64 encoding with random salt
- Simple XOR cipher with rotating keys
- Data fragmentation across multiple storage locations
- Decoy data to prevent easy identification

**⚠️ Important Note**: Fallback storage provides minimal security and should only be used when other options are unavailable.

![Storage Hierarchy](images/storage-hierarchy.png)

### Credential Management Interface

**Security Status Dashboard**

The Settings > Security section provides comprehensive security information:

**Encryption Status**:
- Current encryption level (OS/Browser/Fallback)
- Security strength indicator (Strong/Medium/Weak)
- Available upgrade options
- Last security assessment date

**Stored Credentials**:
- List of stored integration credentials
- Encryption status for each credential
- Last access and update timestamps
- Security audit results

**Migration Tools**:
- Upgrade to stronger encryption when available
- Migration between storage backends
- Bulk credential re-encryption
- Security assessment and recommendations

![Security Dashboard](images/security-dashboard.png)

**Credential Management Tools**:

1. **View Credential Status**
   - See which credentials are stored securely
   - Check encryption levels for each service
   - Monitor access patterns and usage

2. **Update Encryption**
   - Upgrade to stronger encryption when possible
   - Re-encrypt credentials with new keys
   - Test encryption/decryption functionality

3. **Security Testing**
   - Verify credential storage and retrieval
   - Test integration authentication
   - Validate encryption implementation

4. **Emergency Recovery**
   - Export credentials for backup (encrypted)
   - Reset credentials in case of corruption
   - Clear all stored credentials if compromised

![Credential Management Tools](images/credential-management-tools.png)

## Integration Security

### elabFTW Security

**API Key Management**:
- Secure storage of elabFTW API keys
- Automatic key rotation support
- Permission validation and monitoring
- Secure transmission over HTTPS

**Authentication Security**:
- Token-based authentication
- Automatic session refresh
- Secure credential validation
- Integration health monitoring

**Data Protection**:
- Encrypted transmission of metadata
- Validation of data integrity
- Secure handling of experiment IDs
- Protection against injection attacks

![elabFTW Security](images/elabftw-security.png)

### OMERO Security

**Proxy Server Security**:
- Python proxy server for CORS handling
- Local-only binding (localhost) by default
- Session token validation and forwarding
- Request sanitization and validation

**Authentication Flow**:
- Secure credential transmission to proxy
- Session token management
- Automatic re-authentication on expiry
- Multi-factor authentication support

**Data Security**:
- Encrypted communication with OMERO server
- Secure handling of image metadata
- Protection of annotation data
- Validation of dataset permissions

![OMERO Security](images/omero-security.png)

## User Data Protection

### Personal Information Security

**Profile Data**:
- Encryption of personal information
- Secure storage of user preferences
- Protection of contact information
- Privacy controls for profile visibility

**Activity Monitoring**:
- Secure logging of user activities
- Anonymization of sensitive actions
- Retention policies for log data
- Access controls for audit information

**Data Isolation**:
- User-specific data segregation
- Template library access controls
- Project metadata protection
- Secure sharing mechanisms

![User Data Protection](images/user-data-protection.png)

### Privacy Controls

**Data Collection Transparency**:
- Clear disclosure of collected information
- User consent for optional data collection
- Granular privacy controls
- Easy access to collected data

**Data Sharing Controls**:
- User control over template sharing
- Privacy settings for collaboration
- Secure sharing with external users
- Revocable access permissions

**Data Retention**:
- User-controlled data retention policies
- Secure deletion of unwanted data
- Backup and recovery with privacy protection
- Compliance with data protection regulations

## Network Security

### Communication Security

**HTTPS Everywhere**:
- All external communications use TLS 1.3
- Certificate validation and pinning
- Perfect Forward Secrecy (PFS)
- Protection against downgrade attacks

**API Security**:
- Authenticated API requests
- Rate limiting and abuse protection
- Input validation and sanitization
- Protection against common attacks (SQLi, XSS, CSRF)

**Proxy Security**:
- Secure proxy server implementation
- Local-only binding for OMERO proxy
- Request filtering and validation
- Session security and isolation

![Network Security](images/network-security.png)

### Firewall and Network Configuration

**Recommended Firewall Rules**:
- Allow HTTPS (443) to elabFTW servers
- Allow HTTPS (443) to OMERO.web servers
- Block unnecessary outbound connections
- Monitor and log network activity

**Network Isolation**:
- Separate network segments for research data
- VPN requirements for remote access
- Network access controls and monitoring
- Intrusion detection and prevention

**Corporate Network Integration**:
- Proxy server configuration for corporate firewalls
- Authentication with corporate identity providers
- Compliance with network security policies
- Integration with network monitoring tools

## Security Best Practices

### For Individual Users

**Password Security**:
- Use strong, unique passwords for all integrations
- Enable two-factor authentication where available
- Regularly update passwords and API keys
- Use password managers for credential storage

**Device Security**:
- Keep operating system and MetaFold updated
- Use device encryption (FileVault, BitLocker, LUKS)
- Enable screen locks and automatic logout
- Secure physical access to devices

**Data Handling**:
- Regularly backup important templates and projects
- Use secure file sharing for collaboration
- Avoid storing sensitive data in unsecured locations
- Follow institutional data handling policies

![Individual Security Practices](images/individual-security-practices.png)

### For Teams and Organizations

**Access Management**:
- Implement principle of least privilege
- Regular review and audit of user access
- Prompt deactivation of departed users
- Multi-factor authentication requirements

**Policy Development**:
- Clear data classification and handling policies
- Security training and awareness programs
- Incident response and breach notification procedures
- Regular security assessments and audits

**Technical Controls**:
- Network segmentation and access controls
- Centralized logging and monitoring
- Regular security updates and patching
- Backup and disaster recovery planning

![Organizational Security](images/organizational-security.png)

## Security Monitoring and Auditing

### Audit Logging

**Logged Events**:
- User authentication and authorization
- Credential access and modification
- Template creation, modification, and sharing
- Integration usage and errors
- Administrative actions and configuration changes

**Log Security**:
- Encrypted storage of audit logs
- Tamper-evident logging mechanisms
- Secure transmission of logs to central systems
- Retention policies for audit data

**Monitoring Capabilities**:
- Real-time security event monitoring
- Automated alerting for suspicious activities
- Regular audit log review and analysis
- Integration with SIEM systems

![Security Monitoring](images/security-monitoring.png)

### Security Assessments

**Regular Security Checks**:
- Weekly credential security validation
- Monthly security configuration review
- Quarterly security assessment and testing
- Annual penetration testing and audit

**Vulnerability Management**:
- Regular security updates and patches
- Vulnerability scanning and assessment
- Threat intelligence monitoring
- Incident response and remediation

**Compliance Monitoring**:
- Adherence to institutional security policies
- Compliance with data protection regulations
- Security control effectiveness testing
- Documentation and reporting

## Incident Response

### Security Incident Types

**Credential Compromise**:
- Stolen or exposed API keys
- Unauthorized access to integration services
- Password breaches or leaks
- Session hijacking attempts

**Data Breach**:
- Unauthorized access to research data
- Template or metadata exposure
- User information disclosure
- System compromise

**Service Disruption**:
- Denial of service attacks
- System compromise and malware
- Integration service failures
- Data corruption or loss

![Incident Types](images/incident-types.png)

### Response Procedures

**Immediate Response**:
1. **Contain the Incident** - Isolate affected systems and users
2. **Assess the Scope** - Determine what data or systems are affected
3. **Notify Stakeholders** - Alert administrators and affected users
4. **Document Everything** - Record all incident details and actions

**Investigation and Recovery**:
1. **Forensic Analysis** - Determine root cause and attack vectors
2. **System Recovery** - Restore systems and data from backups
3. **Security Improvements** - Implement fixes and improvements
4. **Post-Incident Review** - Learn from incident and update procedures

**Communication**:
- Clear communication with affected users
- Notification of relevant authorities if required
- Public disclosure if necessary
- Follow-up with stakeholders on resolution

![Incident Response Process](images/incident-response-process.png)

## Compliance and Regulations

### Data Protection Compliance

**GDPR (General Data Protection Regulation)**:
- Lawful basis for data processing
- User consent and data subject rights
- Data minimization and purpose limitation
- Privacy by design implementation

**HIPAA (Health Insurance Portability and Accountability Act)**:
- Protected health information handling
- Administrative, physical, and technical safeguards
- Business associate agreements
- Breach notification requirements

**Institutional Policies**:
- University and research institution policies
- Funding agency requirements
- International collaboration agreements
- Ethics and research integrity standards

![Compliance Requirements](images/compliance-requirements.png)

### Security Standards

**ISO 27001/27002**:
- Information security management systems
- Security control implementation
- Risk assessment and management
- Continuous improvement processes

**NIST Cybersecurity Framework**:
- Identify, Protect, Detect, Respond, Recover
- Risk-based approach to cybersecurity
- Framework implementation guidance
- Maturity assessment and improvement

**Research Data Security Standards**:
- FAIR data principles and security
- Research data lifecycle protection
- Collaborative research security
- Open science and security balance

## Advanced Security Features

### Enterprise Integration

**Single Sign-On (SSO)**:
- SAML 2.0 and OAuth 2.0 support
- Integration with Active Directory and LDAP
- Multi-factor authentication enforcement
- Centralized access management

**Certificate Management**:
- X.509 certificate validation
- Certificate pinning for critical services
- Automated certificate renewal
- Certificate revocation checking

**Hardware Security**:
- Hardware security module (HSM) support
- Smart card and token authentication
- Biometric authentication integration
- Secure element utilization

![Enterprise Security](images/enterprise-security.png)

### Advanced Threat Protection

**Anomaly Detection**:
- Machine learning-based behavior analysis
- Unusual access pattern detection
- Automated threat response
- False positive minimization

**Endpoint Protection**:
- Integration with endpoint detection and response (EDR)
- Malware detection and prevention
- Device compliance checking
- Remote wipe capabilities

**Data Loss Prevention**:
- Sensitive data identification and classification
- Automated policy enforcement
- Data exfiltration prevention
- Content inspection and filtering

## Security Configuration

### Initial Security Setup

**Security Assessment**:
1. **Run Security Check** in Settings > Security
2. **Review Security Status** and recommendations
3. **Upgrade Encryption** if better options available
4. **Configure Security Policies** for your environment

**Credential Migration**:
1. **Backup Existing Credentials** before migration
2. **Test New Storage Backend** with test credentials
3. **Migrate All Credentials** to secure storage
4. **Verify Migration Success** and delete old credentials

![Security Setup Process](images/security-setup-process.png)

### Ongoing Security Maintenance

**Regular Tasks**:
- Weekly security status review
- Monthly credential rotation and updates
- Quarterly security assessment and testing
- Annual security policy review and updates

**Monitoring Activities**:
- Daily review of security alerts and logs
- Weekly analysis of user access patterns
- Monthly review of integration security
- Quarterly threat landscape assessment

**Update Procedures**:
- Automatic security updates when possible
- Staged deployment of security patches
- Testing of security updates before deployment
- Rollback procedures for failed updates

## Getting Help with Security

### Security Support Resources

**Documentation**:
- Comprehensive security documentation and guides
- Best practices and configuration examples
- Troubleshooting guides for common security issues
- Regular updates with new security information

**Support Channels**:
- Dedicated security support team
- Emergency incident response hotline
- Community forums for security discussions
- Professional security consulting services

**Training and Education**:
- Security awareness training for users
- Administrator training for security features
- Regular security webinars and updates
- Certification programs for security professionals

![Security Support](images/security-support.png)

### Security Community

**User Community**:
- Active user community sharing security experiences
- Peer support for security configuration and issues
- Best practices sharing and discussion
- Collaborative security improvement efforts

**Research and Development**:
- Ongoing security research and improvement
- Collaboration with academic security researchers
- Integration with security industry standards
- Contribution to open source security projects

## Next Steps

Now that you understand MetaFold security:

- **[Explore Advanced Features](advanced-features.md)** for power users and advanced configurations
- **[Review Troubleshooting Guide](troubleshooting.md)** for security-related problem solving
- **[User Management](user-management.md)** for team-based security implementation
- **[Integration Security](combined-integrations.md)** for secure elabFTW and OMERO workflows

---

*Security is not just a feature—it's the foundation that enables confident, collaborative research data management!*