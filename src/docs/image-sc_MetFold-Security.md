# Managing User Credentials in Shared Lab Environments with MetaFold

*Draft for image.sc Forum Post*

---

**Topic:** Handling individual user credentials (OMERO, eLabFTW) on shared microscope workstations

Hi everyone,

I wanted to share some insights into how **MetaFold** handles user security, specifically for the common scenario in imaging facilities: **The Shared Windows Account.**

## The Challenge
In many labs, microscope PCs use a single generic Windows login (e.g., "MicroscopeUser") that everyone shares. However, users still need to connect to services like **OMERO** or **eLabFTW** using their *personal* institutional credentials.

Storing these passwords is convenient but risky:
1.  **Plaintext is a no-go.**
2.  **Standard OS encryption (DPAPI)** is tied to the *Windows User*. If Alice and Bob both use the "MicroscopeUser" Windows account, DPAPI would allow Bob to decrypt Alice's saved passwords because they are technically the same OS user.

## The Solution: Two-Layer "Entropy" Encryption

To solve this, MetaFold implements a **User-Specific Entropy** layer on top of the standard OS encryption. Here is how it works under the hood:

### Layer 1: Data at Rest (OS Level)
We use Electron's `safeStorage` API, which utilizes the OS-native encryption (DPAPI on Windows). This ensures that if someone copies the database file to a USB stick and takes it home, they cannot read it because it's encrypted with the microscope PC's machine keys.

### Layer 2: User Access (Application Level)
Since Layer 1 decrypts successfully for *anyone* logged into the shared Windows account, we add a second layer.
When a user (e.g., "Thomas") logs into MetaFold with their local app password:

1.  **Derivation:** We use **PBKDF2** to derive a unique encryption key (entropy) from the user's MetaFold password.
2.  **Encryption:** When saving your OMERO password, it is encrypted using *both* the OS key AND this derived user key.
3.  **Verification:** When you try to use the stored credential later, the system attempts to decrypt it. If the current session's derived key doesn't match the one used to encrypt the data, the decryption fails.

### The Result
Even though Alice and Bob share the same Windows Desktop:
*   Alice **cannot** use Bob's stored OMERO password.
*   If Alice tries to switch to Bob's user profile in MetaFold without knowing Bob's MetaFold password, the stored credentials remain locked and unreadable (returning garbage or failing verification).

## Security Model & Limitations
This system is designed for the **"Honest Colleague"** threat model:
*   ✅ **Protects against:** Accidental usage of other's accounts, curiosity, and "drive-by" credential theft on the shared PC.
*   ❌ **Does not protect against:** A sophisticated attacker with administrative access to the machine who installs keyloggers or memory dumpers.

For high-security environments, we always recommend using individual Windows accounts or not saving passwords at all. But for the daily workflow in a facility, this approach strikes a balance between **convenience** (auto-login to OMERO) and **security** (keeping credentials private).

Happy to hear your thoughts or questions on this implementation!
