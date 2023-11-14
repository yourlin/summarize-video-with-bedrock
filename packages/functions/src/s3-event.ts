import {S3Event} from "aws-lambda";
import AWS from 'aws-sdk';
import {Bucket} from "sst/node/bucket";

const transcribe = new AWS.TranscribeService();
const s3 = new AWS.S3()
const bedrockruntime = new AWS.BedrockRuntime({apiVersion: '2023-09-30'});
export const handleS3UploadResponse = async (event: S3Event): Promise<void> => {
    try {
        // Extract the relevant information from the event
        const {Records} = event;
        const uploadedFiles = Records.map(record => record.s3.object.key);

        // Process the uploaded video files
        for (const file of uploadedFiles) {
            // Add your custom logic here to handle the uploaded video file
            const decodedFile = decodeURIComponent(file.replace(/\+/g, " "));
            // Perform any necessary operations before triggering Transcribe

            // Trigger AWS Transcribe to extract text from the video
            await startTranscriptionJob(decodedFile);
        }

        console.log('S3 upload response event processed successfully.');
    } catch (error) {
        console.error('Error processing S3 upload response event:', error);
        throw error;
    }
};


const readJsonFromS3 = async (bucket: string, file: string): Promise<object> => {
    const params: AWS.S3.GetObjectRequest = {
        Bucket: bucket,
        Key: file
    };

    try {
        const response = await s3.getObject(params).promise();
        const jsonContent = response.Body?.toString('utf-8');
        if (jsonContent) {
            return JSON.parse(jsonContent);
        } else {
            throw new Error('Empty JSON content');
        }
    } catch (error) {
        console.error('Error reading JSON file from S3:', error);
        throw error;
    }
};

function replaceFileExtension(filePath: string, newExtension: string): string {
    // 使用正则表达式匹配文件路径中的后缀名
    const regex = /\.[^.]+$/;

    // 将文件路径中的后缀名替换为新的后缀名
    return filePath.replace(regex, `.${newExtension}`);
}

const startTranscriptionJob = async (file: string): Promise<void> => {
    const jobName = `TranscribeJob_${Date.now()}`;

    const params: AWS.TranscribeService.StartTranscriptionJobRequest = {
        TranscriptionJobName: jobName,
        LanguageCode: 'en-US',
        Media: {
            MediaFileUri: `s3://${Bucket.SummarizeInputBucket.bucketName}/${file}`
        },
        OutputBucketName: Bucket.TranscribeOutputBucket.bucketName,
        OutputKey: replaceFileExtension(file, 'json')
    };

    try {
        const response = await transcribe.startTranscriptionJob(params).promise();
        console.log(`Transcription job started: ${response.TranscriptionJob?.TranscriptionJobName}`);
    } catch (error) {
        console.error('Error starting Transcribe job:', error);
        throw error;
    }
};

export const summarize = async (event: S3Event): Promise<void> => {
    const {Records} = event;
    const uploadedFiles = Records.map(record => record.s3.object.key);
    try {
        // Extract the relevant information from the event
        const {Records} = event;
        const uploadedFiles = Records.map(record => record.s3.object.key);

        // Process the uploaded files
        for (const file of uploadedFiles) {
            // Add your custom logic here to handle the uploaded file
            console.log(`Processing file: ${file}`);

            // Read the JSON file from S3
            const jsonContent = await readJsonFromS3(Bucket.TranscribeOutputBucket.bucketName, file);
            const context = jsonContent['results'].transcripts[0].transcript;
            const task = 'According to the <Context>, summarize the text.'
            const promptTemplate = `\n\nHuman:<Context>${context}</Context><task>${task}</task>\n\nAssistant:`;
            // Perform any further processing with the JSON content
            const body = JSON.stringify({
                "prompt": promptTemplate,
                "max_tokens_to_sample": 300,
                "temperature": 0.5,
                "top_k": 250,
                "top_p": 1,
                "stop_sequences": [
                    "\n\nHuman:"
                ],
            })
            const params = {
                body: body,
                modelId: 'anthropic.claude-instant-v1', /* required */
                accept: '*/*',
                contentType: 'application/json'
            };
            bedrockruntime.invokeModel(params, function (err: any, data: any) {
                if (err) console.log(err, err.stack); // an error occurred

                // 定义要写入的文本内容
                const textContent = JSON.parse(data.body.toString()).completion;
                // 将文本内容转换为Buffer
                const buffer = Buffer.from(textContent, 'utf-8');

                // 设置S3上传参数
                const params: AWS.S3.PutObjectRequest = {
                    Bucket: Bucket.SummarizeOutputBucket.bucketName,
                    Key: replaceFileExtension(file, 'txt'),
                    Body: buffer,
                };

                // 使用S3上传文件
                s3.putObject(params, (err, data) => {
                    if (err) {
                        console.error('Error:', err);
                    } else {
                        console.log('Summarized text file uploaded successfully:', data);
                    }
                });
            });
        }

        console.log('S3 upload response event processed successfully.');
    } catch (error) {
        console.error('Error processing S3 upload response event:', error);
        throw error;
    }
};

