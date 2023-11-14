import { StackContext, Bucket} from "sst/constructs";

export function API({ stack }: StackContext) {
  // Create a new bucket
  const inputBucket = new Bucket(stack, "SummarizeInputBucket", {
    notifications: {
      transcribe: {
        function: {
          handler: "packages/functions/src/s3-event.handleS3UploadResponse",
          timeout: "10 seconds",
        },
        events: ["object_created"],
        filters: [],
      },
    },
  });
  const transcribeOutputBucket = new Bucket(stack, "TranscribeOutputBucket", {
    notifications: {
      summarize: {
        function: {
          handler: "packages/functions/src/s3-event.summarize",
          timeout: "30 seconds",
        },
        events: ["object_created"],
        filters: [{ suffix: ".json" }],
      },
    },
  });
  const summarizeOutputBucket = new Bucket(stack, "SummarizeOutputBucket", {});

  // Allow the notification functions to access the bucket
  inputBucket.bind([transcribeOutputBucket, inputBucket]);
  inputBucket.attachPermissions([inputBucket, transcribeOutputBucket, 'transcribe']);
  transcribeOutputBucket.bind([transcribeOutputBucket, summarizeOutputBucket]);
  transcribeOutputBucket.attachPermissions(['bedrock', transcribeOutputBucket, summarizeOutputBucket]);

  stack.addOutputs({
    InputBucketName: inputBucket.bucketName,
    TranscribeOutputBucketName: transcribeOutputBucket.bucketName,
    SummarizeOutputBucketName: summarizeOutputBucket.bucketName
  });
}
