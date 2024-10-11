export type UserAttributes = {
  id: string;
  raw_user_meta_data: {
    name: string;
  };
  campaigns: CampaignAttributes[];
};

export type WitnessAttributes = {
  id: string;
  location_history: WitnessLocationAttributes[];
};

export type WitnessLocationAttributes = {
  lat: string;
  long: string;
  country: string;
  state: string;
  city: string;

  created_at: string;
  updated_at: string;
};

export type TransactionAttributes = {
  id: string;
  user_id: string;
  campaign_id: string;

  /**
   * unsigned integer with no decimals, we asume 2 decimal points like Stripe, eg. 1000 means 10.00
   * this is the balance from which we charge our fees and pay the witnesses
   */
  amount: number;

  provider: "stripe" | "paypal" | "crypto";
  type: "card" | "deposit" | "crypto_tx" | "bank_transfer";

  /**
   * for a refund, we create a new Tx record
   */
  status: "pending" | "complete";

  created_at: string;
  updated_at: string;
};

/**
 * Could also be "Campaign" or "Quest"
 */
export type CampaignAttributes = {
  id: string;
  user_id: string;
  user: UserAttributes;

  /**
   * There should be only 1 transaction linked to this campaign.
   * It is the funding transaction.
   * Evidence is paid to witnesses and linked to a new transaction each, where the accounting exercise should result in a balance between the funding tx and the aggregated evidence payout txs
   */
  transaction_id?: string;

  /**
   * eg. Will something happen in the future?
   */
  text: string;

  /**
   * Category
   * eg.
    * 1. Political developments
    * 2. Economic trends and business news
    * 3. Social issues and human rights
    * 4. Environmental concerns and climate change
    * 5. Health and medical breakthroughs
    * 6. Technology and innovation
    * 7. Cultural events and arts
    * 8. Sports news and major competitions
    * 9. Education and academic research
    * 10. Crime and law enforcement
    * 11. Natural disasters and emergency responses
    * 12. Infrastructure and urban development
    * 13. Agriculture and food security
    * 14. Energy and resource management
    * 15. Transportation and logistics
    * 16. Military and defense news
    * 17. Diplomatic relations and international agreements
    * 18. Religious events and conflicts
    * 19. Migration and refugee situations
    * 20. Labor issues and workers' rights
    * 21. Tourism and travel industry developments
    * 22. Fashion and lifestyle trends
    * 23. Entertainment industry news
    * 24. Scientific discoveries and space exploration
    * 25. Historical findings and archaeological discoveries
   */
  category: string;

  /**
   * eg. yes or no
   */
  criteria: CriteriaAttributes[];

  starts_at: number;
  ends_at: number;

  judging_models: JudgingModelAttributes[];

  /**
   * latlang points, 2 depth array because a user may select different areas of the worldmap
   */
  map_bounds: string[][];

  /**
   * instruction
   * This is for the AI to ingest.
   * eg. For the given question: "Will something happen in the future?"
   * Determine if "{{ evidence.text }}" leans towards {{ Campaign.Criteria["yes"].value }} or {{ Campaign.Criteria["no"].value }}
   * Respond extrictly with "yes" or "no" only.
   */
  instruction: string;

  evidence: EvidenceAttributes[];
  winning_criteria?: CriteriaAttributes;
};

export type JudgingModelAttributes = {
  /**
   * eg. openai
   */
  provider: string;

  /**
   * eg. gpt-o1
   */
  version: string;
};

export type EvidenceAttributes = {
  id: string;

  /**
   * eg. any opinion about why yes or no of a evidence.text
   */
  text: string;

  /**
   * The transaction (if any, if approved), made to pay the witness that submitted this evidence
   */
  transaction_id?: string;

  user_id: string;
  user: UserAttributes;

  campaign_id: string;

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

  /**
   * eg. Reddit
   */
  name: string;

  /**
   * eg. r/swamnetwork
   */
  slug: string;
};

export type CriteriaAttributes = {
  /**
   * a number between 0 and 1 representing the total weight of its value against a given Comment Assessment. It is updated on every Campaign.Comment iteration
   */
  score: number;

  /**
   * The specifics of why this Criteria will be considered relevant and its evidence approved.
   */
  description: string;

  /**
   * eg. yes. Could be a number too. This is how we measure the aggregated results. 70% yes, 30% no.
   */
  value: string;

  /**
   * give AI instructions on how to read or interpret this value
   */
  instruction?: string;
};

export type CreateCaseRequest = {
  text: CampaignAttributes["text"];
  criteria: Pick<CriteriaAttributes, "value" | "description">[];
};
