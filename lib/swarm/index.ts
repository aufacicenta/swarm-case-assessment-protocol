import openai from "@/lib/openai";

import {
  ChannelAttributes,
  CommentAttributes,
  CreatePostRequest,
  CriteriaAttributes,
  CaseAttributes,
  UserAttributes,
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
  attributes: CommentAttributes;

  constructor(args: CommentAttributes) {
    this.attributes = args;
  }

  async assess(_case: Case): Promise<Comment> {
    try {
      const instruction = _case.attributes.instruction.replace("{{comment.text}}", this.attributes.text);

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
      const [winning_criteria] = _case.criteria.filter(
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

export class Case {
  attributes: CaseAttributes;
  criteria: Criteria[];

  constructor(args: CaseAttributes) {
    this.attributes = args;
    this.criteria = args.criteria.map((c) => new Criteria(c));
  }

  createComment(args: CommentAttributes): Comment {
    const comment = new Comment(args);

    this.attributes.comments.push(comment.attributes);

    return comment;
  }

  setWinningCriteria(): Case {
    return this;
  }

  calculateTotalCriteriaScore(): Case {
    try {
      const criteriaScoreMap: Record<string, { value: string; instances: string[] }> = {};

      for (const criteria of this.attributes.criteria) {
        criteriaScoreMap[criteria.value] = { value: criteria.value, instances: [] };
      }

      for (const comment of this.attributes.comments) {
        if (comment.winning_criteria) {
          const value = comment.winning_criteria.value.toLowerCase();
          criteriaScoreMap[value].instances.push(value);
        }
      }

      const totalComments = this.attributes.comments.filter((c) => !!c.winning_criteria).length;

      const updatedCriteria = [];
      for (const criteria of this.attributes.criteria) {
        const instances = criteriaScoreMap[criteria.value].instances.length;
        const percentage = totalComments > 0 ? instances / totalComments : 0;
        criteria.score = Number(percentage.toFixed(2));
        updatedCriteria.push(criteria);
      }

      this.attributes.criteria = updatedCriteria;

      const updatedComments: CommentAttributes[] = [];

      for (const comment of this.attributes.comments) {
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

      this.attributes.comments = updatedComments;

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
  createCase(): Case {
    const body: CreatePostRequest = {
      text: "Ethereum above $2,600 on October 4?",
      criteria: [{ value: "yes" }, { value: "no" }],
    };

    const criteria = body.criteria.map((c) => {
      return new Criteria({
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
          cases: [],
        }),
    );

    const [liberalLisa] = users;

    const optionsText = body.criteria.map((j) => `\"${j.value}\"`).join(" or ");

    const _case = new Case({
      id: "id",
      text: body.text,
      user_id: liberalLisa.attributes.id,
      user: liberalLisa.attributes,
      comments: [],

      criteria: criteria.map((c) => c.attributes),

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

    const comments: CommentAttributes[] = exampleOpinions1.map((o, i) => ({
      id: "id",
      text: o.comment,
      user_id: "user_id",
      case_id: _case.attributes.id,
      user: users[i].attributes,
      channel_id: channels[Math.floor(Math.random() * channels.length)].attributes.id,
      channel: channels[Math.floor(Math.random() * channels.length)].attributes,
    }));

    comments.map((c) => _case.createComment(c));

    return _case;
  }

  async assessCase(_case: Case): Promise<Case> {
    await Promise.all(
      _case.attributes.comments.map(async (args) => {
        const comment = new Comment(args);
        return await comment.assess(_case);
      }),
    );

    return _case.calculateTotalCriteriaScore();
  }
}
