# @rayenking/discord-mcp

`@rayenking/discord-mcp` is a Discord Model Context Protocol (MCP) server that gives MCP clients a broad, practical Discord automation surface through a single stdio process.

It exists for people who want to work with Discord from MCP-enabled tools without building a custom bot integration from scratch. The project focuses on breadth, production usefulness, and message fidelity.

Unlike lightweight Discord MCP integrations that only expose message text or a narrow command set, this server returns full message-oriented data where available, including attachments, embeds, stickers, reactions, and reply metadata.

## Features

- 94 Discord tools across messaging, channels, permissions, forums, moderation, roles, events, invites, webhooks, discovery, stats, screening, DMs, and attachments
- Full message data serialization including attachments, embeds, stickers, reactions, and reply references
- Attachment download support for Discord CDN URLs
- Guild discovery, moderation, member management, role management, and permission auditing workflows
- Forum, webhook, scheduled event, invite, and membership screening support
- Stdio MCP server that works with OpenCode, Claude Desktop, and other MCP clients
- No extra runtime setup beyond a Discord bot token

## Quick start

Run it directly with `npx`:

```bash
DISCORD_TOKEN='your-bot-token' npx @rayenking/discord-mcp
```

The executable name exposed by the package is:

```bash
rayenking-discord-mcp
```

If `DISCORD_TOKEN` is missing, the process exits gracefully with an error explaining that the environment variable is required.

## Setup

### Linux / macOS

Add to your MCP client config (OpenCode, Claude Desktop, etc.):

```json
{
  "mcp": {
    "discord": {
      "type": "local",
      "command": ["bash", "-c", "DISCORD_TOKEN='your-bot-token' exec rayenking-discord-mcp"]
    }
  }
}
```

Or using `npx`:

```json
{
  "mcp": {
    "discord": {
      "type": "local",
      "command": ["bash", "-c", "DISCORD_TOKEN='your-bot-token' exec npx -y @rayenking/discord-mcp"]
    }
  }
}
```

### Windows

```json
{
  "mcp": {
    "discord": {
      "type": "local",
      "command": ["powershell", "-Command", "$env:DISCORD_TOKEN='your-bot-token'; npx.cmd -y @rayenking/discord-mcp"]
    }
  }
}
```

> **Important:** On Windows, use `npx.cmd` instead of `npx` (PowerShell execution policy may block the `.ps1` wrapper that `npx` resolves to).

#### If the token is still not detected on Windows

Some MCP clients may not propagate environment variables correctly. Set `DISCORD_TOKEN` as a permanent system environment variable:

**Option 1 — PowerShell (current user, persistent):**

```powershell
[Environment]::SetEnvironmentVariable('DISCORD_TOKEN', 'your-bot-token', 'User')
```

Then restart your terminal and MCP client. The token will be available to all processes.

**Option 2 — System Settings:**

1. Open **Settings** → **System** → **About** → **Advanced system settings**
2. Click **Environment Variables**
3. Under **User variables**, click **New**
4. Variable name: `DISCORD_TOKEN`
5. Variable value: your bot token
6. Click OK, restart your terminal and MCP client

After setting the global env var, simplify your config to:

```json
{
  "mcp": {
    "discord": {
      "type": "local",
      "command": ["npx.cmd", "-y", "@rayenking/discord-mcp"]
    }
  }
}
```

### Generic MCP client

Any MCP client that can launch a stdio server can use this package.

1. Invoke with `npx @rayenking/discord-mcp` (or `npx.cmd` on Windows)
2. Set `DISCORD_TOKEN` in the launched process environment
3. Connect over stdio
4. Tools are discovered dynamically from the MCP `tools/list` response

## Discord bot setup

To use this server, create a Discord bot and supply its token.

### 1. Create the bot

1. Open the [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Add a bot user under the **Bot** section
4. Copy the bot token and store it securely

### 2. Enable the required intents

This project initializes the bot with these gateway intents:

- `Guilds`
- `GuildMessages`
- `MessageContent`
- `GuildMembers`
- `GuildModeration`
- `GuildScheduledEvents`
- `GuildInvites`
- `DirectMessages`

In the Discord Developer Portal, enable the privileged intents that apply to your use case, especially:

- **Message Content Intent**
- **Server Members Intent**

### 3. Invite the bot with appropriate permissions

Choose permissions based on the tools you intend to use. Common examples include:

- View Channels
- Send Messages
- Manage Messages
- Read Message History
- Add Reactions
- Manage Channels
- Manage Roles
- Kick Members
- Ban Members
- Moderate Members
- Manage Webhooks
- Manage Events
- Create Invites
- Manage Nicknames

Use a least-privilege approach where possible. Some tools will fail if the bot lacks the necessary Discord permission in a given guild or channel.

## Environment variables

### `DISCORD_TOKEN`

Required. The Discord bot token used to authenticate the MCP server.

```bash
DISCORD_TOKEN='your-bot-token'
```

If this variable is not set, the server exits with a clear error instead of hanging silently.

## Tool categories

This package currently exposes 94 tools.

### Discovery and server information

- `discord_list_guilds`
- `discord_get_guild_info`
- `discord_get_server_stats`
- `discord_get_audit_log`

### Messages, embeds, pins, search, and reactions

- `discord_read_messages`
- `discord_send_message`
- `discord_reply_message`
- `discord_send_embed`
- `discord_send_multiple_embeds`
- `discord_edit_message`
- `discord_delete_message`
- `discord_bulk_delete_messages`
- `discord_pin_message`
- `discord_fetch_pinned_messages`
- `discord_add_reaction`
- `discord_remove_reactions`
- `discord_get_reactions`
- `discord_search_messages`
- `discord_forward_message`
- `discord_crosspost_message`
- `discord_edit_embed`

### Channels and announcements

- `discord_list_channels`
- `discord_find_channel_by_name`
- `discord_create_channel`
- `discord_edit_channel`
- `discord_delete_channel`
- `discord_move_channel`
- `discord_clone_channel`
- `discord_set_channel_position`
- `discord_follow_announcement_channel`

### Permissions and audits

- `discord_get_channel_permissions`
- `discord_set_role_permission`
- `discord_set_member_permission`
- `discord_lock_channel_permissions`
- `discord_reset_channel_permissions`
- `discord_copy_permissions`
- `discord_audit_permissions`

### Members and moderation

- `discord_list_members`
- `discord_get_member_info`
- `discord_search_members`
- `discord_set_nickname`
- `discord_kick_member`
- `discord_ban_member`
- `discord_unban_member`
- `discord_timeout_member`
- `discord_list_bans`
- `discord_bulk_ban`
- `discord_prune_members`

### Roles

- `discord_list_roles`
- `discord_create_role`
- `discord_edit_role`
- `discord_delete_role`
- `discord_add_role`
- `discord_remove_role`
- `discord_get_role_members`
- `discord_set_role_position`
- `discord_set_role_icon`

### Forums

- `discord_get_forum_channels`
- `discord_create_forum_channel`
- `discord_list_forum_threads`
- `discord_create_forum_post`
- `discord_get_forum_post`
- `discord_reply_to_forum`
- `discord_delete_forum_post`
- `discord_get_forum_tags`
- `discord_set_forum_tags`
- `discord_update_forum_post`

### Scheduled events

- `discord_list_scheduled_events`
- `discord_get_scheduled_event`
- `discord_create_scheduled_event`
- `discord_edit_scheduled_event`
- `discord_delete_scheduled_event`
- `discord_get_event_subscribers`
- `discord_create_event_invite`

### Invites

- `discord_list_invites`
- `discord_get_invite`
- `discord_create_invite`
- `discord_delete_invite`
- `discord_list_channel_invites`

### Webhooks

- `discord_create_webhook`
- `discord_send_webhook_message`
- `discord_edit_webhook`
- `discord_delete_webhook`
- `discord_list_webhooks`
- `discord_edit_webhook_message`
- `discord_delete_webhook_message`
- `discord_fetch_webhook_message`

### Membership screening

- `discord_get_membership_screening`
- `discord_update_membership_screening`

### Direct messages

- `discord_send_dm`
- `discord_read_dms`
- `discord_list_dm_channels`
- `discord_send_dm_embed`

### Attachments

- `discord_download_attachment`

## Why this exists

Discord automation through MCP is most useful when it can do more than read a few messages. This project aims to be a practical Discord operations layer for MCP clients, covering the workflows people actually need: moderation, messaging, channel management, roles, invites, forums, events, webhooks, and richer message inspection.

It is especially useful if you want access to fuller Discord message payloads than many competing integrations expose.

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE).
