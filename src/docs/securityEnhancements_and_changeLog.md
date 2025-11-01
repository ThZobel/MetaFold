## Password System Security Improvements

### Multi-Layer Encryption
- OS-native DPAPI (Data Protection API) for credential storage
- User-specific entropy derivation prevents cross-user access
- PBKDF2-based key derivation (50,000 iterations)
- HMAC signatures for data integrity verification

### Protected Credentials
- ✅ **MetaFold User Passwords** - Multi-layer encryption with user entropy
- ✅ **OMERO Credentials** - Server passwords with user-specific entropy
- ✅ **elabFTW API Keys** - Full entropy protection for external services
- ✅ **All Integration Credentials** - Unified security architecture

### Access Control
- DevTools restricted to Admin users only
- Admin verification for sensitive operations
- localStorage tamper detection
- Security audit logging

### Technical Details
- **Encryption**: Electron safeStorage (DPAPI) + user entropy
- **Hashing**: PBKDF2-SHA256 (100,000 iterations)
- **Entropy**: Per-user password-based key derivation
- **Protection**: Object.freeze + Proxy patterns

### Security Level
- **Before**: ⭐⭐ (Basic encryption)
- **After**: ⭐⭐⭐⭐⭐ (Multi-layer with entropy)

### Compatibility
- ✅ Backward compatible with legacy formats
- ✅ Auto-migration on next save
- ✅ No breaking changes

---

## 🖥️ Cross-Platform Security

### OS-Native Encryption Backends

| Operating System | Backend | Protection Level |
|-----------------|---------|------------------|
| **Windows** | DPAPI | Windows user-context |
| **macOS** | Keychain | macOS user + Keychain lock |
| **Linux** | libsecret | GNOME Keyring / KWallet |

### Security Scenarios

#### 🏢 Multi-User Shared Computers (e.g., Lab Windows PCs)
**Scenario**: Multiple MetaFold users sharing one Windows account
- ⭐⭐⭐⭐⭐ **Full Protection**: User-specific entropy prevents cross-user access
- DPAPI alone insufficient (shared OS account limitation)
- Application-level entropy layer solves this

#### 🏠 Private Single-User Computers (macOS/Linux)
**Scenario**: Personal computer with one OS user
- ⭐⭐⭐⭐⭐ **Fully Secure**: OS-native encryption (Keychain/libsecret) sufficient
- User entropy provides additional security layer
- No security concerns in single-user setup

### Security Recommendations

#### ✅ Sufficient Security When:
- Single OS user account
- Single MetaFold user
- Full disk encryption enabled (FileVault/LUKS/BitLocker)
- OS password-locked when unattended

#### ⭐ Optimal Security:
- Enable full disk encryption
- Use strong OS user passwords
- Lock computer when away
- Regular security updates

---

## 📝 Technical Notes

**Addresses shared Windows account DPAPI limitation through application-level user-specific entropy.**

All credentials (MetaFold users, OMERO passwords, elabFTW API keys) receive identical multi-layer protection. On private computers with single OS users, the OS-native encryption (Keychain/libsecret) provides the same security level as industry-standard password managers like 1Password or Bitwarden.

---

**Version**: 2.0  
**Date**: November 2025  
**Status**: ✅ Production Ready