# JavaCard Smartcard Support

The desktop app supports storing Shamir shares, encrypted vaults, keyfiles, and encrypted inheritance plans on **JCOP3 JavaCard smartcards** (e.g., J3H145), providing tamper-resistant physical backups that survive fire, water, and digital threats.

## Hardware Requirements

- **Card:** JCOP3 J3H145 or compatible JavaCard 3.0.4+ smartcard (~110 KB usable EEPROM)
- **Reader:** Any PC/SC-compatible USB smart card reader

## Features

- **Write individual shares**, **full vaults**, **keyfiles**, or **encrypted inheritance plans** to a card via APDU over PC/SC
- **Read back** shares, vaults, or keyfiles directly from a card into the restore workflow
- **Multi-item storage** — store multiple items (shares, vaults, keyfiles, instructions) on a single card up to ~8 KB; new writes append to existing data
- **Per-item management** — view, select, and delete individual items from the Smart Card Manager page
- **Optional PIN protection** (8-16 characters) — card locks after 5 wrong attempts
- **PIN retry countdown** — real-time display of remaining PIN attempts (color-coded: gray → amber → red) across both the Smart Card Manager page and the smart card dialog
- **Generate PIN** — CSPRNG-powered 16-character PIN generator (upper/lowercase, numbers, symbols) with copy-to-clipboard and reveal/hide toggle
- **Data chunking** — automatically handles payloads larger than the 240-byte APDU limit
- **Clone card** — read all items from one card and write them to another card via the Smart Card Manager page; supports both single-reader (swap card) and dual-reader workflows with an optional destination PIN
- **Erase** confirmation to prevent accidental data loss

## Applet Installation

The seQRets applet must be installed on each card before use. See [BUILDING.md](../BUILDING.md#-javacard-applet-installation) for build and installation instructions.

## Applet AID

`F0 53 51 52 54 53 01 00 00` — selected automatically by the desktop app.
