import { discord, ensureConnected } from "../client.js";
import type { ToolModule } from "./types.js";

function text(value: unknown): { content: { type: "text"; text: string }[] } {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  };
}

interface ScreeningField {
  field_type: string;
  label: string;
  values?: string[];
  required: boolean;
}

interface ScreeningResponse {
  version: string;
  form_fields: ScreeningField[];
  description: string | null;
}

const definitions: ToolModule["definitions"] = [
  {
    name: "discord_get_membership_screening",
    description:
      "Get the current membership screening form (rules/questions new members must complete).",
    inputSchema: {
      type: "object" as const,
      properties: {
        guild_id: { type: "string", description: "The guild ID." },
      },
      required: ["guild_id"],
    },
  },
  {
    name: "discord_update_membership_screening",
    description:
      "Update the membership screening form: set a description and rules/questions that new members must agree to before joining.",
    inputSchema: {
      type: "object" as const,
      properties: {
        guild_id: { type: "string", description: "The guild ID." },
        description: {
          type: "string",
          description:
            "Welcome message shown at the top of the screening form.",
        },
        form_fields: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: {
                type: "string",
                description: "Title/question for this field.",
              },
              values: {
                type: "array",
                items: { type: "string" },
                description: "Array of rule lines or answer options.",
              },
              required: {
                type: "boolean",
                description:
                  "Whether this field is required (default true).",
              },
            },
            required: ["label", "values"],
          },
          description: "List of rules/questions.",
        },
      },
      required: ["guild_id"],
    },
  },
];

const handlers: ToolModule["handlers"] = {
  async discord_get_membership_screening(args) {
    await ensureConnected();
    const guildId = args.guild_id as string;
    const data = (await discord.rest.get(
      `/guilds/${guildId}/member-verification`,
    )) as ScreeningResponse;
    return text({
      description: data.description,
      fields: data.form_fields.map((f: ScreeningField) => ({
        fieldType: f.field_type,
        label: f.label,
        values: f.values ?? [],
        required: f.required,
      })),
    });
  },

  async discord_update_membership_screening(args) {
    await ensureConnected();
    const guildId = args.guild_id as string;

    const body: Record<string, unknown> = {};

    if (args.description !== undefined) {
      body.description = args.description as string;
    }

    if (args.form_fields !== undefined) {
      const fields = args.form_fields as {
        label: string;
        values: string[];
        required?: boolean;
      }[];
      body.form_fields = fields.map((f) => ({
        field_type: "TERMS",
        label: f.label,
        values: f.values,
        required: f.required ?? true,
      }));
    }

    const data = (await discord.rest.patch(
      `/guilds/${guildId}/member-verification`,
      { body },
    )) as ScreeningResponse;

    return text({
      description: data.description,
      fields: data.form_fields.map((f: ScreeningField) => ({
        fieldType: f.field_type,
        label: f.label,
        values: f.values ?? [],
        required: f.required,
      })),
    });
  },
};

export const screeningModule: ToolModule = { definitions, handlers };
