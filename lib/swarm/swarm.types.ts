export type UserAttributes = {
  id: string;
  raw_user_meta_data: {
    name: string;
  };
  cases: CaseAttributes[];
};

export type CaseAttributes = {
  id: string;
  text: string; // eg. Will something happen in the future?
  criteria: CriteriaAttributes[]; // eg. yes or no
  user_id: string;
  user: UserAttributes;

  starts_at: number;
  ends_at: number;

  judging_models: JudgingModelAttributes[];

  /**
   * instruction
   * This is for the AI to ingest.
   * eg. For the given question: "Will something happen in the future?"
   * Determine if "{{ Comment.text }}" leans towards {{ Case.Criteria["yes"].value }} or {{ Case.Criteria["no"].value }}
   * Respond extrictly with "yes" or "no" only.
   */
  instruction: string;

  comments: CommentAttributes[];
  winning_criteria?: CriteriaAttributes;
};

export type JudgingModelAttributes = {
  provider: string; // eg. openai
  version: string; // eg. gpt-o1
};

export type CommentAttributes = {
  id: string;
  text: string; // eg. any opinion about why yes or no of a Case.text
  user_id: string;
  user: UserAttributes;
  case_id: string;
  winning_criteria?: CriteriaAttributes;
  channel_id: string;
  channel: ChannelAttributes;
};

// could be Source
export type ChannelAttributes = {
  id: string;
  name: string; // eg. Reddit
  slug: string; // eg. r/swamnetwork
};

export type CriteriaAttributes = {
  score: number; // a number between 0 and 1 representing the total weight of its value against a given Comment Assessment. It is updated on every Case.Comment iteration
  value: string; // eg. yes. Could be a number too. This is how we measure the aggregated results. 70% yes, 30% no.
  description?: string; // give AI instructions on how to read or interpret this value
};

export type CreateCaseRequest = {
  text: CaseAttributes["text"];
  criteria: Pick<CriteriaAttributes, "value" | "description">[];
};
