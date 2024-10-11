import openai from "@/lib/openai";

import {
  ChannelAttributes,
  EvidenceAttributes,
  CriteriaAttributes,
  CampaignAttributes,
  UserAttributes,
  CreateCaseRequest,
} from "./swarm.types";

import userPersonas from "./user-personas.json";
import exampleOpinions1 from "./example-opinion-1.json";

class User {
  attributes: UserAttributes;

  constructor(args: UserAttributes) {
    this.attributes = args;
  }
}

class Comment {
  attributes: EvidenceAttributes;

  constructor(args: EvidenceAttributes) {
    this.attributes = args;
  }

  async assess(campaign: Campaign): Promise<Comment> {
    try {
      const instruction = campaign.attributes.instruction.replace("{{comment.text}}", this.attributes.text);

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

      // Expect "yes" or "no" and update the Post.criteria[] scores
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
}

class Channel {
  attributes: ChannelAttributes;

  constructor(args: ChannelAttributes) {
    this.attributes = args;
  }
}

class Criteria {
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
    this.criteria = args.criteria.map((c) => new Criteria(c));
  }

  createComment(args: EvidenceAttributes): Comment {
    const comment = new Comment(args);

    this.attributes.evidence.push(comment.attributes);

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

      for (const comment of this.attributes.evidence) {
        if (comment.winning_criteria) {
          const value = comment.winning_criteria.value.toLowerCase();
          criteriaScoreMap[value].instances.push(value);
        }
      }

      const totalComments = this.attributes.evidence.filter((c) => !!c.winning_criteria).length;

      const updatedCriteria: CriteriaAttributes[] = [];
      for (const criteria of this.attributes.criteria) {
        const instances = criteriaScoreMap[criteria.value].instances.length;
        const percentage = totalComments > 0 ? instances / totalComments : 0;
        criteria.score = Number(percentage.toFixed(2));
        updatedCriteria.push(criteria);
      }

      this.attributes.criteria = updatedCriteria;

      const updatedComments: EvidenceAttributes[] = [];

      for (const comment of this.attributes.evidence) {
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
  createCase(): Campaign {
    const body: CreateCaseRequest = {
      text: "Ethereum above $2,600 on October 4?",
      criteria: [{ value: "yes", description: "" }, { value: "no", description: "" }],
    };

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
      category: "category",
      user_id: liberalLisa.attributes.id,
      user: liberalLisa.attributes,
      evidence: [],
      map_bounds: [],

      criteria: criteria.map((c: Criteria) => c.attributes),

      instruction: `For the given question: ${body.text}\n
Determine if "{{comment.text}}" leans more towards ${optionsText}.\n
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

    const channel1 = new Channel({
      id: "id",
      name: "Reddit",
      slug: "r/swarmnetwork",
    });

    const channel2 = new Channel({
      id: "id",
      name: "Telegram",
      slug: "@agivengroup",
    });

    const channel3 = new Channel({
      id: "id",
      name: "Instagram",
      slug: "@agivenpost",
    });

    const channel4 = new Channel({
      id: "id",
      name: "Twitter",
      slug: "@agivenpost",
    });

    const channels = [channel1, channel2, channel3, channel4];

    const evidence: EvidenceAttributes[] = exampleOpinions1.map((o, i) => {
      const randomChannel = channels[Math.floor(Math.random() * channels.length)];

      return {
        id: "id",
        text: o.comment,
        user_id: "user_id",
        campaign_id: campaign.attributes.id,
        user: users[i].attributes,
        channel_id: randomChannel.attributes.id,
        channel: randomChannel.attributes,
      };
    });

    evidence.map((c) => campaign.createComment(c));

    return campaign;
  }

  async assessCase(campaign: Campaign): Promise<Campaign> {
    await Promise.all(
      campaign.attributes.evidence.map(async (args) => {
        const comment = new Comment(args);
        return await comment.assess(campaign);
      }),
    );

    return campaign.calculateTotalCriteriaScore();
  }
}
