import openai from "@/lib/openai";

import {
  ChannelAttributes,
  EvidenceAttributes,
  CriteriaAttributes,
  CampaignAttributes,
  UserAttributes,
  CreateCampaignRequest,
  WitnessAttributes,
} from "./swarm.types";

import userPersonas from "./user-personas.json";
import { sample } from "lodash";

export class Witness {
  attributes: WitnessAttributes;

  constructor(args: WitnessAttributes) {
    this.attributes = args;
  }
}

export class User {
  attributes: UserAttributes;
  name: UserAttributes["raw_user_meta_data"]["name"];

  constructor(args: UserAttributes) {
    this.attributes = args;
    this.name = args.raw_user_meta_data.name;
  }
}

export class Evidence {
  attributes: EvidenceAttributes;

  constructor(args: EvidenceAttributes) {
    this.attributes = args;
  }

  async assess(campaign: Campaign): Promise<Evidence> {
    try {
      const instruction = campaign.attributes.instruction.replace("{{evidence.text}}", this.attributes.text);

      console.log({ instruction });

      // Call the AI Model with the instruction and this comment interpolated
      const result = await openai.client.chat.completions.create({
        model: "gpt-4o",
        n: 1,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: instruction,
              },
            ],
          },
        ],
      });

      // console.log(result);

      // Expect "yes" or "no" and update the Campaign.criteria[] scores
      const content = result.choices[0].message.content;

      const [winning_criteria] = campaign.criteria.filter(
        (c) => c.attributes.value.toLowerCase() === content?.toLowerCase(),
      );

      // Update this Comment.winning_criteria from the AI assessment result
      if (winning_criteria?.attributes) {
        this.attributes.winning_criteria = winning_criteria.attributes;
      }
    } catch (error) {
      console.error(error);
    }

    return this;
  }

  static async _generateText(campaign: Campaign): Promise<string | undefined> {
    try {
      const criteria = sample(campaign.attributes.criteria);

      const instruction = `Create an example evidence report for the following: "${campaign.attributes.text}".
The evidence report should meet this criteria: ${criteria?.description} and should render as ${criteria?.value}.`;

      console.log({ instruction });

      // Call the AI Model with the instruction and this comment interpolated
      const result = await openai.client.chat.completions.create({
        model: "gpt-4o",
        n: 1,
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: instruction,
              },
            ],
          },
        ],
      });

      console.log(result);

      const content = result.choices[0].message.content;

      return content!;
    } catch (error) {
      console.error(error);
    }

    return undefined;
  }
}

export class Channel {
  attributes: ChannelAttributes;

  constructor(args: ChannelAttributes) {
    this.attributes = args;
  }
}

export class Criteria {
  attributes: CriteriaAttributes;

  constructor(args: CriteriaAttributes) {
    this.attributes = args;
  }
}

export class Campaign {
  attributes: CampaignAttributes;
  criteria: Criteria[];

  constructor(args: CampaignAttributes) {
    this.attributes = args;

    if (!args.evidence) {
      this.attributes.evidence = [];
    }

    this.criteria = args.criteria.map((c) => new Criteria(c));
  }

  appendEvidence(args: EvidenceAttributes): Evidence {
    const comment = new Evidence(args);

    this.attributes.evidence!.push(comment.attributes);

    return comment;
  }

  setWinningCriteria(): Campaign {
    return this;
  }

  calculateTotalCriteriaScore(): Campaign {
    try {
      const criteriaScoreMap: Record<string, { value: string; instances: string[] }> = {};

      for (const criteria of this.attributes.criteria) {
        criteriaScoreMap[criteria.value] = { value: criteria.value, instances: [] };
      }

      for (const comment of this.attributes.evidence!) {
        if (comment.winning_criteria) {
          const value = comment.winning_criteria.value.toLowerCase();
          criteriaScoreMap[value].instances.push(value);
        }
      }

      const totalComments = this.attributes.evidence!.filter((c) => !!c.winning_criteria).length;

      const updatedCriteria: CriteriaAttributes[] = [];
      for (const criteria of this.attributes.criteria) {
        const instances = criteriaScoreMap[criteria.value].instances.length;
        const percentage = totalComments > 0 ? instances / totalComments : 0;
        criteria.score = Number(percentage.toFixed(2));
        updatedCriteria.push(criteria);
      }

      this.attributes.criteria = updatedCriteria;

      const updatedComments: EvidenceAttributes[] = [];

      for (const comment of this.attributes.evidence!) {
        if (comment.winning_criteria) {
          const updatedCriteria = this.attributes.criteria.find(
            (c) => c.value.toLowerCase() === comment.winning_criteria!.value.toLowerCase(),
          );

          if (updatedCriteria) {
            comment.winning_criteria = { ...updatedCriteria };
          }
        }

        updatedComments.push(comment);
      }

      this.attributes.evidence = updatedComments;

      const winningCriteria = this.attributes.criteria.reduce((prev, current) =>
        prev.score > current.score ? prev : current,
      );

      this.attributes.winning_criteria = winningCriteria;
    } catch (error) {
      console.error(error);
    }

    return this;
  }

  toJson() {
    return this.attributes;
  }
}

export class Deliberatorium {
  createCampaign(body: CreateCampaignRequest): Campaign {
    const criteria = body.criteria.map((c) => {
      return new Criteria({
        description: c.description,
        value: c.value,
        score: 0,
      });
    });

    const users = userPersonas.map(
      (u) =>
        new User({
          id: "user_id",
          raw_user_meta_data: {
            name: u.name,
          },
          campaigns: [],
        }),
    );

    const [liberalLisa] = users;

    const optionsText = body.criteria.map((j) => `\"${j.value}\"`).join(" or ");

    const campaign = new Campaign({
      id: "id",
      text: body.text,
      category: body.category,
      user_id: liberalLisa.attributes.id,
      user: liberalLisa.attributes,
      evidence: [],
      map_bounds: [],

      criteria: criteria.map((c: Criteria) => c.attributes),

      instruction: `For the given question: ${body.text}\n
Determine if "{{evidence.text}}" leans more towards ${optionsText}.\n
Respond strictly with ${optionsText} only. Avoid adding any symbols or characters rather than literraly ${optionsText}.`,

      starts_at: new Date().getTime(),
      ends_at: new Date().getTime(),

      judging_models: [
        {
          provider: "openai",
          version: "gpt-o1",
        },
      ],
    });

    return campaign;
  }

  async appendEvidence(campaign: Campaign, source: EvidenceAttributes[]): Promise<Campaign> {
    source.map((c) => campaign.appendEvidence(c));

    return campaign;
  }

  async assessCampaign(campaign: Campaign): Promise<Campaign> {
    await Promise.all(
      campaign.attributes.evidence!.map(async (args) => {
        const comment = new Evidence(args);
        return await comment.assess(campaign);
      }),
    );

    return campaign.calculateTotalCriteriaScore();
  }
}
