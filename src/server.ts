import dotenv from 'dotenv';
import express from 'express';
import type { Request, Response } from 'express';
import { OpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";
import { StructuredOutputParser, OutputFixingParser } from 'langchain/output_parsers';
import { ApifyDatasetLoader } from 'langchain/document_loaders/web/apify_dataset';

dotenv.config();

const port = process.env.PORT || 3001;
const apiKey = process.env.Open_AI_APIkey;

// Check if the API key is defined
if (!apiKey) {
  console.error('OPENAI_API_KEY is not defined. Exiting...');
  process.exit(1);
}

const app = express();
app.use(express.json());

// TODO: Initialize the OpenAI model
const model: OpenAI = new OpenAI({temperature: 0.5, openAIApiKey: apiKey, modelName: 'gpt-3.5-turbo'});



// TODO: Define the parser for the structured output
const parser = StructuredOutputParser.fromZodSchema(z.object({
  temperature: z.number().describe('The temperature in Fahrenheit'),
  weather: z.string().describe('The weather description'),
  humidity: z.number().describe('The humidity percentage'),
  wind: z.number().describe('The wind speed in mph'),
}));



// TODO: Get the format instructions from the parser
const formatInstructions = parser.getFormatInstructions();

// TODO: Define the prompt template
const promptTemplate = new PromptTemplate({
  template: 'What is the weather in {location}?',
  inputVariables: ['location'],
  partialVariables: {format_instructions: formatInstructions},
});


// Create a prompt function that takes the user input and passes it through the call method
const promptFunc = async (input: string) => {
  try {
        // TODO: Format the prompt with the user input
        const formattedPrompt = await promptTemplate.format({ location: input });
        // TODO: Call the model with the formatted prompt
        const response = await model.invoke(formattedPrompt);
        // TODO: return the JSON response
        return response;
        // TODO: Catch any errors and log them to the console
    } catch (error) {
        console.error(error);
        return error;
    }
};

// Endpoint to handle request
app.post('/forecast', async (req: Request, res: Response): Promise<void> => {
  try {
    const location: string = req.body.location;
    if (!location) {
      res.status(400).json({
        error: 'Please provide a location in the request body.',
      });
    }
    const result: any = await promptFunc(location);
    res.json({ result });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error:', error.message);
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
