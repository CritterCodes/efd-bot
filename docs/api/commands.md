# EFD Discord Bot Commands

*Generated on 9/14/2025*

## Command Overview

Total Commands: **9**

## Economy Commands

### /gems

Manage your GEMS currency

**Parameters:**

- **user** (User) - ❌ Optional
  - User to check balance for (admin only)
- **user** (User) - ✅ Required
  - User to add GEMS to
- **user** (User) - ✅ Required
  - User to remove GEMS from
- **page** (Integer) - ❌ Optional
  - Page number to view
- **amount** (Integer) - ✅ Required
  - Amount of GEMS to add
- **amount** (Integer) - ✅ Required
  - Amount of GEMS to remove
- **reason** (String) - ✅ Required
  - Reason for adding GEMS
- **reason** (String) - ✅ Required
  - Reason for removing GEMS

**Examples:**

- `/gems balance` - Check your GEMS balance
- `/gems leaderboard` - View server GEMS rankings
- `/gems transfer @user 100 reason` - Transfer GEMS to another user

**Permissions:** Administrator

---

### /tip

Tip GEMS to another user

**Parameters:**

- **user** (User) - ✅ Required
  - User to tip GEMS to
- **amount** (Integer) - ✅ Required
  - Amount of GEMS to tip
- **reason** (String) - ❌ Optional
  - Optional reason for the tip

**Examples:**

- `/tip @user 50` - Tip 50 GEMS to another user
- `/tip @user 100 Great work!` - Tip with a custom reason

**Permissions:** Everyone

---

## General Commands

### /ping

Replies with Pong!

**Examples:**

- `/ping` - Execute the ping command

**Permissions:** Everyone

---

### /roadmap

Display the development roadmap and progress

**Parameters:**

- **phase_id** (String) - ✅ Required
  - Phase ID (e.g., phase-1)

**Examples:**

- `/roadmap` - Execute the roadmap command

**Permissions:** Everyone

---

### /services

Look up services offered by a Discord user.

**Parameters:**

- **user** (User) - ✅ Required
  - The user to look up

**Examples:**

- `/services` - Execute the services command

**Permissions:** Everyone

---

## Administration Commands

### /roadmap-admin

Administrative commands for roadmap management

**Parameters:**

- **phase_id** (String) - ✅ Required
  - Phase ID to update
- **status** (String) - ✅ Required
  - New status for the phase
- **notes** (String) - ❌ Optional
  - Optional notes about the status change
- **phase_id** (String) - ✅ Required
  - Phase that was completed

**Examples:**

- `/roadmap-admin` - Execute the roadmap-admin command

**Permissions:** Administrator

---

## Verification Commands

### /setup-verify

Set up the verification message with button (Admin only)

**Examples:**

- `/setup-verify` - Execute the setup-verify command

**Permissions:** Administrator

---

### /verify-reset

Reset verification status (Admin only)

**Parameters:**

- **user** (User) - ❌ Optional
  - User to reset (leave empty to reset yourself)

**Examples:**

- `/verify-reset` - Execute the verify-reset command

**Permissions:** Administrator

---

### /verify

Start member verification process.

**Examples:**

- `/verify` - Execute the verify command

**Permissions:** Everyone

---

