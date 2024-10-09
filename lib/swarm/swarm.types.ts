export type UserAttributes = {
  id: string;
  raw_user_meta_data: {
    name: string;
  };
  cases: CaseAttributes[];
};

export type TransactionAttributes = {
  id: string;
  user_id: string;
  case_id: string;

  /**
   * unsigned integer with no decimals, we asume 2 decimal points like Stripe, eg. 1000 means 10.00
   * this is the balance from which we charge our fees and pay the witnesses
   */
  amount: number;

  provider: "stripe" | "paypal" | "crypto";
  type: "card" | "deposit" | "crypto_tx";

  status: "pending" | "complete"; // for a refund, we create a new Tx record
  created_at: string;
  updated_at: string;
};

/**
 * Could also be "Campaign" or "Quest"
 */
export type CaseAttributes = {
  id: string;
  user_id: string;
  user: UserAttributes;

  transaction_id?: string;

  text: string; // eg. Will something happen in the future?
  criteria: CriteriaAttributes[]; // eg. yes or no

  starts_at: number;
  ends_at: number;

  judging_models: JudgingModelAttributes[];

  map_bounds: string[][]; // latlang points, 2 depth array because a user may select different areas of the worldmap

  /**
   * instruction
   * This is for the AI to ingest.
   * eg. For the given question: "Will something happen in the future?"
   * Determine if "{{ Comment.text }}" leans towards {{ Case.Criteria["yes"].value }} or {{ Case.Criteria["no"].value }}
   * Respond extrictly with "yes" or "no" only.
   */
  instruction: string;

  evidence: EvidenceAttributes[];
  winning_criteria?: CriteriaAttributes;
};

export type JudgingModelAttributes = {
  provider: string; // eg. openai
  version: string; // eg. gpt-o1
};

export type EvidenceAttributes = {
  id: string;
  text: string; // eg. any opinion about why yes or no of a Case.text

  user_id: string;
  user: UserAttributes;

  case_id: string;

  channel_id: string;
  channel: ChannelAttributes;

  winning_criteria?: CriteriaAttributes;

  confidence_level?: number;
  truthfulness_level?: number;
  supportive_information?: number;
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
