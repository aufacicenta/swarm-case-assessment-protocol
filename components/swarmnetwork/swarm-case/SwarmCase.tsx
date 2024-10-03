import clsx from "clsx";
import { SwarmCaseProps } from "./SwarmCase.types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomLabel } from "@/components/custom-label/CustomLabel";

export const SwarmCase: React.FC<SwarmCaseProps> = ({ className, _case, commentsByChannel }) => {
  return (
    <div className={clsx("min-h-screen px-1 py-[69px] sm:py-[96px]", className)}>
      <header className="flex flex-col items-center justify-between px-2 py-10 sm:flex-row sm:px-6">
        <div>
          <h1 className="mb-0 text-2xl sm:text-4xl">{_case.text}</h1>
          <p className="text-muted-foreground">
            Criteria: {_case.criteria.map((criteria) => `"${criteria.value}"`).join(" or ")}
          </p>
        </div>
        <div className="flex w-full flex-col py-4 sm:w-fit sm:flex-row sm:py-0 [&>div:not(:last-child)]:mb-2 [&>div:not(:last-child)]:sm:mb-0 [&>div:not(:last-child)]:sm:mr-2">
          {_case.criteria.map((criteria) => (
            <CustomLabel
              key={criteria.value}
              className={clsx("", {
                ["rounded border border-solid border-yellow-400"]:
                  _case.winning_criteria?.value.toLowerCase() === criteria.value.toLowerCase(),
              })}
            >
              <CustomLabel.Head>
                <h4 className="mb-0">{criteria.value}</h4>
              </CustomLabel.Head>
              <CustomLabel.Description>
                <h5 className="mb-0">{criteria.score}</h5>
              </CustomLabel.Description>
            </CustomLabel>
          ))}
          <CustomLabel className="">
            <CustomLabel.Head>
              <h4 className="mb-0">Comments Count</h4>
            </CustomLabel.Head>
            <CustomLabel.Description>
              <h5 className="mb-0">{_case.comments.length}</h5>
            </CustomLabel.Description>
          </CustomLabel>
          <CustomLabel className="">
            <CustomLabel.Head>
              <h4 className="mb-0">Channels Count</h4>
            </CustomLabel.Head>
            <CustomLabel.Description>
              <h5 className="mb-0">{Object.keys(commentsByChannel).length}</h5>
            </CustomLabel.Description>
          </CustomLabel>
          <CustomLabel className="">
            <CustomLabel.Head>
              <h4 className="mb-0">Judging Model</h4>
            </CustomLabel.Head>
            <CustomLabel.Description>
              <h5 className="mb-0">
                {_case.judging_models[0].provider}/{_case.judging_models[0].version}
              </h5>
            </CustomLabel.Description>
          </CustomLabel>
        </div>
      </header>

      <section className="-mx-1 mb-6 flex w-full flex-col overflow-x-auto px-2 sm:flex-row sm:flex-nowrap sm:px-6 [&>div:not(:last-child)]:mb-6 [&>div:not(:last-child)]:sm:mb-0">
        {Object.keys(commentsByChannel).map((key) => (
          <div key={key} className="w-full flex-shrink-0 px-2 sm:w-4/12">
            <Card>
              <CardHeader>
                <CardTitle>{commentsByChannel[key][0].channel.name}</CardTitle>
                <CardDescription>{commentsByChannel[key][0].channel.slug}</CardDescription>
              </CardHeader>
              {commentsByChannel[key].map((comment) => (
                <div key={comment.id} className="[&:not(:last-child)]:mb-2">
                  <CardContent className="flex min-h-[150px] flex-col justify-center bg-slate-500">
                    <p className="mb-0">{comment.text}</p>
                  </CardContent>
                  <CardFooter className="px-0 pb-0">
                    <CustomLabel className="w-6/12">
                      <CustomLabel.Head>User</CustomLabel.Head>
                      <CustomLabel.Description>{comment.user.raw_user_meta_data.name}</CustomLabel.Description>
                    </CustomLabel>
                    <CustomLabel className="w-6/12">
                      <CustomLabel.Head>Winning Criteria</CustomLabel.Head>
                      <CustomLabel.Description>{comment.winning_criteria?.value}</CustomLabel.Description>
                    </CustomLabel>
                  </CardFooter>
                </div>
              ))}
            </Card>
          </div>
        ))}
      </section>
    </div>
  );
};
