# Inheritance Planning Guide

Cryptocurrency has no "forgot password" recovery. If the holder dies without a plan, the assets are permanently lost. seQRets is designed to solve this problem.

## The Split Trust Model

The recommended approach creates **layered security with no single point of failure**:

| Layer | What | How |
|-------|------|-----|
| **1. Split the Secret** | Encrypt and split your seed phrase into Qards | Use the **Secure Secret** tab with a 2-of-3 or 3-of-5 threshold |
| **2. Write the Plan** | Create a clear instruction document for your heirs | Use the **Inheritance Plan** tab to encrypt a PDF/DOCX with recovery steps |
| **3. Distribute** | Give Qards to different trusted people/locations | No single person or location gets everything |

## Example: 2-of-3 Distribution

| Item | Location | Who Has Access |
|------|----------|---------------|
| Qard 1 | Home fireproof safe | Spouse |
| Qard 2 | Trusted family member | Sibling or adult child |
| Qard 3 | Bank safe deposit box | Named on the box |
| Encrypted Plan | With estate attorney | Attorney (sealed) |
| Password | Inside the encrypted plan only | No one — until decrypted |

> **Critical rule:** The password should NEVER be stored alongside the Qards. Include it only inside the encrypted inheritance plan document.

## What to Put in Your Inheritance Plan Document

The desktop app's **Create Plan** tab provides a structured 9-section form covering all of these. Alternatively, your encrypted instruction document should include:

- **Asset inventory** — list of wallets, exchanges, and holdings (not the secrets themselves)
- **Recovery instructions** — step-by-step guide for using seQRets to restore the secret
- **Qard locations** — where each Qard is physically stored and who holds it
- **Password** — safe to include here because the document is encrypted
- **Keyfile location** — if used, where the keyfile is stored
- **Exchange accounts** — exchange names, registered emails, and instructions to contact them with a death certificate
- **Hardware wallet locations** — physical devices, PINs, and access instructions
- **Professional contacts** — attorney, financial advisor, trusted technical friend

## Common Mistakes

- ❌ Storing seed phrases in a will (wills become public during probate)
- ❌ Telling no one your crypto exists
- ❌ Giving one person all Qards + the password
- ❌ Never testing the recovery process
- ❌ Forgetting to update after acquiring new assets or changing passwords

## Legal Considerations

> ⚠️ **seQRets is not a legal tool.** Consult a qualified estate planning attorney for wills, trusts, powers of attorney, and tax planning. seQRets handles the technical security layer — splitting and encrypting your secrets — but a complete estate plan requires legal documentation.

Key topics to discuss with your attorney:

- **Digital asset clauses** in your will or trust
- **Revocable living trusts** to avoid probate for crypto assets
- **Durable power of attorney** explicitly covering digital assets (for incapacity, not just death)
- **Tax implications** — inherited crypto may receive a stepped-up cost basis
