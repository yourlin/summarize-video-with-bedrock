# Summarize Video Content Using Bedrock Claude Instant and Transcribe

## Architecture

Through the SST framework, we built a Serverless application to achieve overall functionality. A lambda is triggered through the S3 file upload success event to execute the Amazon Transcribe Job. This job will convert the voice content in the video into text content and store it in another S3 bucket. Through the creation event of the video content text in S3, it will automatically trigger a lambda function to read the file content and forward it to Bedrock's Claude model for text summary tasks. The final summary text obtained will be stored in a new S3 bucket.

## Deploy

Before running, you need to install node.js. If you have not installed it yet, please download the installation package from [node.js official website](https://nodejs.org/)

``` shell
git clone https://github.com/yourlin/summarize-video-with-bedrock.git
npm install
sst build
sst deploy
```

## Usage
### introduce
Open S3 in the AWS console, search for the summarize-video keyword, and you can find 3 related buckets. They are:
- <your-stage>-summarize-video-`summarizeinputbucket`<random-string>
- <your-stage>-summarize-video-`summarizeoutputbucket`<random-string>
- <your-stage>-summarize-video-`transcribeoutputbucket`<random-string>

Or you can find these three buckets in the stack corresponding to Cloudformation and in the output tab page.

- `summarizeinputbucket`: used to upload video files
- `transcribeoutputbucket`: used for Transcribe output results
- `summarizeoutputbucket`: used by Bedrock to summarize the text and output the results

### Test
Now you can upload a video/audio file to the `summarizeinputbucket` bucket. After waiting for tens of seconds, we can see that the summarized text has been generated in the S3 bucket of `summarizeoutputbucket`.
## Reference 
- [SST Document](https://docs.sst.dev/)
- [Amazon Bedrock API runtime InvokeModel](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_InvokeModel.html)