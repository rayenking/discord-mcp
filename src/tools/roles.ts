import { PermissionsBitField } from "discord.js";
import { getGuild } from "../client.js";
import type { ToolModule } from "./types.js";

function text(value: unknown): { content: { type: "text"; text: string }[] } {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  };
}

function serializeRole(role: import("discord.js").Role) {
  return {
    id: role.id,
    name: role.name,
    color: role.hexColor,
    hoist: role.hoist,
    position: role.position,
    mentionable: role.mentionable,
    managed: role.managed,
    permissions: role.permissions.toArray(),
    memberCount: role.members.size,
  };
}

function resolvePermissions(
  names: string[],
): Record<string, true> {
  const flags = PermissionsBitField.Flags;
  const result: Record<string, true> = {};
  for (const name of names) {
    if (!(name in flags)) {
      throw new Error(`Unknown permission: ${name}`);
    }
    result[name] = true;
  }
  return result;
}

const definitions: ToolModule["definitions"] = [
  {
    name: "discord_list_roles",
    description:
      "List all roles in a guild with permissions and member count.",
    inputSchema: {
      type: "object" as const,
      properties: {
        guild_id: { type: "string", description: "The guild ID." },
      },
      required: ["guild_id"],
    },
  },
  {
    name: "discord_create_role",
    description: "Create a new role in a guild.",
    inputSchema: {
      type: "object" as const,
      properties: {
        guild_id: { type: "string", description: "The guild ID." },
        name: { type: "string", description: "Role name." },
        color: {
          type: "string",
          description: "Hex color e.g. #FF5733",
        },
        hoist: { type: "boolean", description: "Display separately in member list." },
        mentionable: { type: "boolean", description: "Allow anyone to mention this role." },
        permissions: {
          type: "array",
          items: { type: "string" },
          description: "e.g. ['SendMessages','ViewChannel']",
        },
      },
      required: ["guild_id", "name"],
    },
  },
  {
    name: "discord_edit_role",
    description:
      "Edit an existing role (name, color, permissions, hoist, mentionable).",
    inputSchema: {
      type: "object" as const,
      properties: {
        guild_id: { type: "string", description: "The guild ID." },
        role_id: { type: "string", description: "The role ID." },
        name: { type: "string", description: "New role name." },
        color: { type: "string", description: "Hex color e.g. #FF5733" },
        hoist: { type: "boolean", description: "Display separately." },
        mentionable: { type: "boolean", description: "Allow mentions." },
        permissions: {
          type: "array",
          items: { type: "string" },
          description: "Permission names to set.",
        },
      },
      required: ["guild_id", "role_id"],
    },
  },
  {
    name: "discord_delete_role",
    description: "Delete a role from a guild.",
    inputSchema: {
      type: "object" as const,
      properties: {
        guild_id: { type: "string", description: "The guild ID." },
        role_id: { type: "string", description: "The role ID." },
        reason: { type: "string", description: "Audit log reason." },
      },
      required: ["guild_id", "role_id"],
    },
  },
  {
    name: "discord_add_role",
    description: "Assign a role to a member.",
    inputSchema: {
      type: "object" as const,
      properties: {
        guild_id: { type: "string", description: "The guild ID." },
        user_id: { type: "string", description: "The user ID." },
        role_id: { type: "string", description: "The role ID." },
        reason: { type: "string", description: "Audit log reason." },
      },
      required: ["guild_id", "user_id", "role_id"],
    },
  },
  {
    name: "discord_remove_role",
    description: "Remove a role from a member.",
    inputSchema: {
      type: "object" as const,
      properties: {
        guild_id: { type: "string", description: "The guild ID." },
        user_id: { type: "string", description: "The user ID." },
        role_id: { type: "string", description: "The role ID." },
        reason: { type: "string", description: "Audit log reason." },
      },
      required: ["guild_id", "user_id", "role_id"],
    },
  },
  {
    name: "discord_get_role_members",
    description: "List all members that have a specific role.",
    inputSchema: {
      type: "object" as const,
      properties: {
        guild_id: { type: "string", description: "The guild ID." },
        role_id: { type: "string", description: "The role ID." },
      },
      required: ["guild_id", "role_id"],
    },
  },
  {
    name: "discord_set_role_position",
    description: "Change a role's position in the hierarchy.",
    inputSchema: {
      type: "object" as const,
      properties: {
        guild_id: { type: "string", description: "The guild ID." },
        role_id: { type: "string", description: "The role ID." },
        position: { type: "number", description: "New position number." },
      },
      required: ["guild_id", "role_id", "position"],
    },
  },
  {
    name: "discord_set_role_icon",
    description:
      "Set a custom icon or unicode emoji on a role (requires server boost level 2+).",
    inputSchema: {
      type: "object" as const,
      properties: {
        guild_id: { type: "string", description: "The guild ID." },
        role_id: { type: "string", description: "The role ID." },
        icon: {
          type: "string",
          description:
            "Image URL for the role icon. Set to null to remove.",
        },
        unicode_emoji: {
          type: "string",
          description:
            "Unicode emoji for the role. Set to null to remove.",
        },
      },
      required: ["guild_id", "role_id"],
    },
  },
];

const handlers: ToolModule["handlers"] = {
  async discord_list_roles(args) {
    const guild = await getGuild(args.guild_id as string);
    const roles = await guild.roles.fetch();
    const sorted = roles.sort((a, b) => b.position - a.position);
    return text(sorted.map((r) => serializeRole(r)));
  },

  async discord_create_role(args) {
    const guild = await getGuild(args.guild_id as string);
    const options: import("discord.js").RoleCreateOptions = {
      name: args.name as string,
    };

    if (args.color !== undefined) {
      options.color = parseInt(
        String(args.color).replace("#", ""),
        16,
      );
    }
    if (args.hoist !== undefined) options.hoist = Boolean(args.hoist);
    if (args.mentionable !== undefined)
      options.mentionable = Boolean(args.mentionable);
    if (args.permissions !== undefined) {
      const perms = args.permissions as string[];
      resolvePermissions(perms);
      options.permissions = perms as import("discord.js").PermissionResolvable[];
    }

    const role = await guild.roles.create(options);
    return text(serializeRole(role));
  },

  async discord_edit_role(args) {
    const guild = await getGuild(args.guild_id as string);
    const role = guild.roles.cache.get(args.role_id as string);
    if (!role) {
      const fetched = await guild.roles.fetch(args.role_id as string);
      if (!fetched) throw new Error(`Role ${args.role_id} not found`);
      return text(
        serializeRole(
          await fetched.edit(buildRoleEditOptions(args)),
        ),
      );
    }
    return text(serializeRole(await role.edit(buildRoleEditOptions(args))));
  },

  async discord_delete_role(args) {
    const guild = await getGuild(args.guild_id as string);
    const role = await guild.roles.fetch(args.role_id as string);
    if (!role) throw new Error(`Role ${args.role_id} not found`);
    await role.delete(args.reason as string | undefined);
    return text({ success: true, deletedRoleId: args.role_id });
  },

  async discord_add_role(args) {
    const guild = await getGuild(args.guild_id as string);
    const member = await guild.members.fetch(args.user_id as string);
    await member.roles.add(
      args.role_id as string,
      args.reason as string | undefined,
    );
    return text({
      success: true,
      userId: args.user_id,
      roleId: args.role_id,
    });
  },

  async discord_remove_role(args) {
    const guild = await getGuild(args.guild_id as string);
    const member = await guild.members.fetch(args.user_id as string);
    await member.roles.remove(
      args.role_id as string,
      args.reason as string | undefined,
    );
    return text({
      success: true,
      userId: args.user_id,
      roleId: args.role_id,
    });
  },

  async discord_get_role_members(args) {
    const guild = await getGuild(args.guild_id as string);
    await guild.members.fetch();
    const role = guild.roles.cache.get(args.role_id as string);
    if (!role) {
      const fetched = await guild.roles.fetch(args.role_id as string);
      if (!fetched) throw new Error(`Role ${args.role_id} not found`);
      return text(
        fetched.members.map((m) => ({
          id: m.id,
          username: m.user.username,
          displayName: m.displayName,
          nickname: m.nickname,
        })),
      );
    }
    return text(
      role.members.map((m) => ({
        id: m.id,
        username: m.user.username,
        displayName: m.displayName,
        nickname: m.nickname,
      })),
    );
  },

  async discord_set_role_position(args) {
    const guild = await getGuild(args.guild_id as string);
    const role = await guild.roles.fetch(args.role_id as string);
    if (!role) throw new Error(`Role ${args.role_id} not found`);
    const position = Number(args.position);
    await role.setPosition(position);
    return text({ id: role.id, name: role.name, position });
  },

  async discord_set_role_icon(args) {
    const guild = await getGuild(args.guild_id as string);
    const role = await guild.roles.fetch(args.role_id as string);
    if (!role) throw new Error(`Role ${args.role_id} not found`);

    const icon = args.icon === "null" || args.icon === null
      ? null
      : (args.icon as string | undefined) ?? null;
    const unicodeEmoji =
      args.unicode_emoji === "null" || args.unicode_emoji === null
        ? null
        : (args.unicode_emoji as string | undefined) ?? null;

    await role.edit({ icon, unicodeEmoji });
    return text({
      id: role.id,
      name: role.name,
      icon: icon,
      unicodeEmoji: unicodeEmoji,
    });
  },
};

function buildRoleEditOptions(
  args: Record<string, unknown>,
): import("discord.js").RoleEditOptions {
  const options: import("discord.js").RoleEditOptions = {};
  if (args.name !== undefined) options.name = args.name as string;
  if (args.color !== undefined) {
    options.color = parseInt(
      String(args.color).replace("#", ""),
      16,
    );
  }
  if (args.hoist !== undefined) options.hoist = Boolean(args.hoist);
  if (args.mentionable !== undefined)
    options.mentionable = Boolean(args.mentionable);
  if (args.permissions !== undefined) {
    const perms = args.permissions as string[];
    resolvePermissions(perms);
    options.permissions = perms as import("discord.js").PermissionResolvable[];
  }
  return options;
}

export const rolesModule: ToolModule = { definitions, handlers };
