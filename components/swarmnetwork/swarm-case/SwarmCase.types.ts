import { CaseAttributes, ChannelAttributes, CommentAttributes } from "@/lib/swarm/swarm.types";
import { ReactNode } from "react";

export type SwarmCaseProps = {
  children?: ReactNode;
  className?: string;
  _case: CaseAttributes;
  commentsByChannel: Record<ChannelAttributes["slug"], CommentAttributes[]>;
};
