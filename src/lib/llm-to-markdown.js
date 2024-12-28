import OpenAI from 'openai';

export async function llmToMarkdown(
    image,
    imageType,
    llmParams,
) {
    try {
        const openai = new OpenAI({
            apiKey: llmParams.apiKey,
            baseURL: llmParams.baseURL,
        });

        const systemPrompt = llmParams.systemPrompt;
        const userPrompt = llmParams.userPrompt;
        const finalImageUrl = isRemoteFile(image)
            ? image
            : `data:image/${imageType};base64,${encodeImageBuffer(image)}`;

        const response = await openai.chat.completions.create({
            model: llmParams.model,
            messages: [
                {
                    role: "system",
                    content: [
                      { type: "text", text: systemPrompt },
                    ]
                },
                {
                  role: "user",
                  content: [
                    { type: "text", text: userPrompt },
                    {
                      type: "image_url",
                      image_url: {
                        url: finalImageUrl,
                      },
                    },
                  ],
                },
              ],
            temperature: 0.1,
            stream: false
        });

        // Check if response has an error
        if (response.error) {
            console.error('API Error:', response.error);
            return `Error processing image: ${response.error.message || 'Unknown error'}`;
        }

        // Check if response has the expected structure
        if (!response.choices?.[0]?.message?.content) {
            console.error('Unexpected API response structure:', response);
            return 'Error: Unexpected API response format';
        }

        let markdown = response.choices[0].message.content; 
        markdown = markdown.replace(/```markdown/g, '').replace(/```/g, '');
        return markdown;
    } catch (error) {
        console.error('OCR Processing Error:', error);
        return `Error processing image: ${error.message}`;
    }
}

function encodeImageBuffer(imageBuffer) {
  return Buffer.from(imageBuffer).toString("base64");
}

function encodeImage(imagePath) {
  const imageFile = fs.readFileSync(imagePath);
  return Buffer.from(imageFile).toString("base64");
}

function isRemoteFile(filePath) {
  if (typeof filePath !== 'string') return false;
  return filePath.startsWith("http://") || filePath.startsWith("https://");
}