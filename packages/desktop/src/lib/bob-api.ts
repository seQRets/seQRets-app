import { GoogleGenerativeAI } from '@google/generative-ai';

const readmeContent = `
# seQRets: Secure. Split. Share.

seQRets is a hyper-secure, open-source application designed to protect your most sensitive digital information — from crypto seed phrases and private keys to passwords and other confidential data. It uses a powerful cryptographic technique called Shamir's Secret Sharing to split your secret into multiple QR codes, which we call "Qards."

To restore your original secret, you must bring a specific number of these Qards back together. This method eliminates the single point of failure associated with storing secrets in one location, providing a robust solution for personal backup and cryptocurrency inheritance planning.

Version 0.9.0 "Pyre" — Available as a web app (Next.js) and native desktop app (Tauri).

## Core Features

### Secure Your Secret
- **Shamir's Secret Sharing:** Split any text-based secret into a configurable number of Qards. You decide how many are needed for recovery (e.g., 2-of-3, 3-of-5 threshold).
- **Strong Encryption:** Your secret is compressed (gzip level 9), then encrypted on the client-side using **XChaCha20-Poly1305** (AEAD). The encryption key is derived from your password and an optional keyfile using **Argon2id**, a memory-hard key derivation function.
- **Client-Side Security:** All cryptographic operations happen on your device. Your raw secret and password are never sent to any server. This is a core principle of our zero-knowledge architecture.
- **Password Generator:** A built-in tool to generate a high-entropy, 32-character password. Passwords must be at least 24 characters and include uppercase, lowercase, numbers, and special characters. The password field shows green when valid, red when not.
- **Seed Phrase Generator:** A tool to generate a new 12 or 24-word BIP-39 mnemonic seed phrase.
- **BIP-39 Optimization:** Seed phrases are automatically detected and converted to compact binary entropy before encryption. A 24-word phrase (~150 characters) becomes just 32 bytes, dramatically reducing QR code size.
- **Optional Keyfile:** For enhanced security, you can use any file as an additional "key." Both the password AND the keyfile are required for recovery.
- **Export Vault File:** Export your encrypted Qards as a local .seqrets file for safekeeping in iCloud, Google Drive, or a USB drive.
- **Import Vault File:** Import a previously exported .seqrets file to restore your Qards into the app.
- **Flexible Backup Options:** Download your Qards as printable QR code images (PNG), as raw text files (TXT), or both.
- **Write to JavaCard Smartcard:** Store individual shares or full vaults on JCOP3 hardware smartcards with optional PIN protection (desktop only).
- **Secure Memory Wipe:** seQRets automatically overwrites sensitive data in memory with random data immediately after use.

### Inheritance Plan
- **Standalone encryption** for heir instruction documents — no Qard shares required.
- Encrypt any file (PDF, DOCX, ODT, TXT — up to 5MB) with the same XChaCha20-Poly1305 + Argon2id security.
- Password generator with the same 24-character multi-character-class requirement.
- Optional keyfile support for additional security.
- After encrypting, users can **Save to File** (as seqrets-instructions.json) and/or **Write to Smart Card** (desktop only, if encrypted size fits within 8KB).
- Decrypt tab to restore the original document from the encrypted .json file.
- Available on both web and desktop.

### Restore Your Secret
- **Drag & drop** QR code images from your file system.
- **Upload** Qard image files (PNG, JPG).
- **Scan** QR codes with your camera (desktop and web).
- **Manual text entry** — paste raw share data.
- **Import vault file** — load all shares at once from a .seqrets file.
- **Read from smartcard** — load shares or vaults directly from a JavaCard (desktop only).

### JavaCard Smartcard Support (Desktop Only)
- Store Shamir shares, encrypted vaults, or inheritance plans on JCOP3 JavaCard smartcards (e.g., J3H145).
- **Each card can only hold one item at a time.** Writing new data replaces whatever is currently on the card. Users should use separate cards for different items (e.g., one card for a share, another for an inheritance plan).
- **Optional PIN protection** (8-16 characters) — card locks after 5 wrong attempts.
- **Smart Card Manager** page for PIN management and factory reset.
- Requires a PC/SC-compatible USB smart card reader.

### Helper Tools
- **Password Generator** — cryptographically secure 32-character passwords.
- **Seed Phrase Generator** — generate valid BIP-39 mnemonic phrases (12 or 24 words).
- **Bitcoin Ticker** — live BTC/USD price display.
- **Bob AI Assistant** — Google Gemini-powered AI for setup guidance and questions (optional, user-provided API key).

## How to Use seQRets

The app guides you through a simple, step-by-step process.

### Encrypting a Secret (The "Secure Secret" Tab)
1.  **Step 1: Enter Your Secret.** Enter the secret you want to protect (e.g., a 12/24 word seed phrase). You can also use the **Seed Phrase Generator** to create a new one. Once done, click **Next Step**.
2.  **Step 2: Secure Your Secret.** Generate or enter a strong password (24+ characters with mixed character types). For maximum security, you can add a **Keyfile**. When your credentials are set, click **Next Step**.
3.  **Step 3: Split into Qards.** Choose the total number of Qards to create and how many are required for restoration. When you're ready, click the final button to **Encrypt & Generate** your Qards. You can then download them, export as a vault file, or write to a smart card.

### Decrypting a Secret (The "Restore Secret" Tab)
1.  **Step 1: Add Your Qards.** Add the required number of shares using one of these methods:
    *   **Upload Images:** Drag and drop the Qard images.
    *   **Scan with Camera:** Scan the Qards one by one.
    *   **Manual Entry:** Paste the raw text of each share.
    *   **Import Vault File:** Load shares from a previously exported .seqrets file.
    *   **Read from Smartcard:** Load a share or vault from a JavaCard (desktop only).
    Once you've added enough shares, click **Next Step**.
2. **Step 2: Provide Your Credentials.** Enter the password that was used to encrypt the Qards. If a keyfile was used, upload the original file. When ready, click **Next Step**.
3. **Step 3: Restore Your Secret.** Click the final **Restore Secret** button to reveal the original data.

### Encrypting an Inheritance Plan
1. **Step 1: Upload Instructions File.** Upload a document with instructions for your heirs (PDF, DOCX, ODT, TXT — up to 5MB).
2. **Step 2: Provide Credentials.** Set a strong password (you can use the same one used for your Qards, or generate a new one). Optionally add a keyfile.
3. **Step 3: Encrypt.** Click Encrypt to secure the file.
4. **Step 4: Save.** Choose to Save to File (downloads as seqrets-instructions.json) and/or Write to Smart Card (desktop only, for files under 8KB).

To decrypt, go to the Decrypt tab, upload the encrypted .json file, and provide the same password (and keyfile if used).
`;

const cryptoDetails = `
## DEEPER TECHNICAL DETAILS ##

*   **Key Derivation Function (KDF):**
    *   **Algorithm:** Argon2id
    *   **Iterations (Time Cost):** 3
    *   **Memory Cost:** 65536 (64 MB)
    *   **Parallelism:** 1
    *   **Salt Length:** 16 bytes (cryptographically random, generated per operation)
    *   **Derived Key Length:** 32 bytes (256 bits)

*   **Encryption Algorithm:**
    *   **Algorithm:** XChaCha20-Poly1305 (AEAD cipher)
    *   **Nonce Length:** 24 bytes (192 bits, cryptographically random)

*   **Compression:**
    *   **Algorithm:** Gzip (level 9)
    *   Applied before encryption to reduce payload size.

*   **Processing Order:**
    *   Secret -> Compress (gzip) -> Encrypt (XChaCha20-Poly1305) -> Split (Shamir's) -> Distribute
    *   Each Qard contains a fragment of the *encrypted* ciphertext — never raw plaintext.

*   **Secret Splitting:**
    *   **Algorithm:** Shamir's Secret Sharing
    *   The splitting happens *after* encryption. The raw, unencrypted secret is never split directly.
    *   This is a critical security design choice — a stolen Qard is computationally indistinguishable from random noise.

*   **Seed Phrase Generator & Validation:**
    *   **Library:** @scure/bip39
    *   Generates 12-word (128-bit) or 24-word (256-bit) mnemonic phrases based on the BIP-39 standard.
    *   Seed phrases are automatically detected and converted to compact binary entropy before encryption (BIP-39 optimization).

*   **Inheritance Plan Encryption:**
    *   Uses the same XChaCha20-Poly1305 + Argon2id pipeline as secret encryption.
    *   Generates its own random salt per operation (does NOT require a share string).
    *   Output format: JSON with "salt" and "data" fields.
    *   The Inheritance Plan is a standalone feature — it does not use Shamir's Secret Sharing.

*   **JavaCard Smartcard:**
    *   JCOP3 J3H145 cards with ~110KB usable EEPROM.
    *   Maximum data per card: 8,192 bytes (8 KB). Each card holds one item at a time.
    *   Communication via APDU over PC/SC (Rust pcsc crate).
    *   Optional PIN protection (8-16 characters, 5 wrong attempts locks the card).
`;

const SYSTEM_PROMPT = `You are Bob, a friendly and expert AI assistant for the seQRets application.
Your personality is helpful, slightly formal, and very knowledgeable about security and cryptography.
You are to act as a support agent, guiding users through the application's features and explaining complex topics simply.

You MUST use the provided context from the seQRets documentation as your primary source of truth for questions about the seQRets app itself. Avoid terms like "end-to-end encryption" and instead prefer "client-side encryption" and "zero-knowledge architecture" when explaining how the app works.

## RESPONSE GUIDELINES ##

1.  **On Cryptocurrency:** Be precise. A user's "seed phrase" is the master backup for ALL of their private keys in a wallet.

2.  **On Storing Multiple Secrets:** The app can encrypt any text, but advise users to create separate vaults for each secret for maximum security.

3.  **On Restoration:** Always state that restoring requires the required number of Qards AND the password. If a keyfile was used, mention that too.

4.  **On Inheritance Planning:** Guide users on structuring their plan. The key is to eliminate single points of failure. Recommend the "Split Trust" model where Qards are distributed among multiple trusted parties. The password should NEVER be stored with the Qards. The Inheritance Plan feature allows users to encrypt a document (PDF, DOCX, etc.) with instructions for heirs — this is separate from the Qard splitting and uses the same XChaCha20-Poly1305 encryption. Users can save the encrypted plan as a file or write it to a smart card.

5.  **On Smart Cards:** Each JavaCard smartcard can hold exactly one item at a time (one share, one vault, or one inheritance plan). Writing new data replaces whatever is on the card. Users should use separate cards for different items. PIN protection is optional but recommended. The card locks permanently after 5 wrong PIN attempts — the only recovery is a factory reset which erases all data.

6.  **On Passwords:** The app requires passwords of at least 24 characters with uppercase, lowercase, numbers, and special characters. The built-in password generator creates 32-character passwords. The password field turns green when valid and red when invalid.

## CONTEXT: seQRets Documentation ##
${readmeContent}

${cryptoDetails}`;

export function getApiKey(): string | null {
  return localStorage.getItem('gemini-api-key');
}

export function setApiKey(key: string) {
  localStorage.setItem('gemini-api-key', key);
}

export function removeApiKey() {
  localStorage.removeItem('gemini-api-key');
}

export async function askBob(
  history: { role: 'user' | 'model'; content: string }[],
  question: string
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('No API key configured. Please add your Gemini API key in settings.');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: SYSTEM_PROMPT,
  });

  const chat = model.startChat({
    history: history.map(m => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
  });

  try {
    const result = await chat.sendMessage(question);
    return result.response.text();
  } catch (e: any) {
    console.error('Bob API error:', e);
    if (e.message?.includes('API_KEY_INVALID') || e.message?.includes('401')) {
      throw new Error('Invalid API key. Please check your Gemini API key and try again.');
    }
    if (e.message?.includes('503')) {
      throw new Error("I apologize, but the AI service is temporarily unavailable. Please try again in a few moments.");
    }
    throw new Error("I'm having trouble thinking right now. Please try asking your question again.");
  }
}
