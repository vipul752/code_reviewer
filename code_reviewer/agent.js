import fs from "fs";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({});

// Retry helper with exponential backoff for rate limits
async function withRetry(fn, maxRetries = 5, baseDelay = 5000) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429 && attempt < maxRetries - 1) {
        // Extract retry delay from error if available, or use exponential backoff
        const retryMatch = error.message?.match(/retry in (\d+(?:\.\d+)?)/i);
        const delay = retryMatch
          ? Math.ceil(parseFloat(retryMatch[1]) * 1000) + 1000
          : baseDelay * Math.pow(2, attempt);
        console.log(
          `Rate limited. Retrying in ${Math.round(delay / 1000)}s... (attempt ${attempt + 1}/${maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

async function listFiles({ directory }) {
  const files = [];
  const extensions = [".js", ".html", ".css", ".json", ".md"];

  function scan(dir) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const itemPath = path.join(dir, item);

      if (itemPath.includes("node_modules") || itemPath.includes(".git"))
        continue;
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        scan(itemPath);
      } else if (extensions.includes(path.extname(item))) {
        files.push(itemPath);
      }
    }
  }

  scan(directory);
  console.log(`Found ${files.length} file`);
  return files;
}

async function readFile({ filePath }) {
  const content = fs.readFileSync(filePath, "utf-8");
  console.log(`reading file ${filePath}`);
  return content;
}

async function writeFile({ filePath, content }) {
  fs.writeFileSync(filePath, content, "utf-8");
  console.log(`writing file ${filePath}`);
  return { success: true };
}

const listFilesTool = {
  name: "listFiles",
  description: "List all files in a directory",
  parameters: {
    type: Type.OBJECT,
    properties: {
      directory: {
        type: Type.STRING,
        description: "The directory to scan for files",
      },
    },
    required: ["directory"],
  },
};

const readFileTool = {
  name: "readFile",
  description: "Read the content of a file",
  parameters: {
    type: Type.OBJECT,
    properties: {
      filePath: {
        type: Type.STRING,
        description: "The path of the file to read",
      },
    },
    required: ["filePath"],
  },
};

const writeFileTool = {
  name: "writeFile",
  description: "Write content to a file",
  parameters: {
    type: Type.OBJECT,
    properties: {
      filePath: {
        type: Type.STRING,
        description: "The path of the file to write",
      },
      content: {
        type: Type.STRING,
        description: "The content to write to the file",
      },
    },
    required: ["filePath", "content"],
  },
};

const tools = {
  listFiles,
  readFile,
  writeFile,
};

export async function runAgent(directoryPath) {
  console.log(`reviewing ${directoryPath} \n`);

  const history = [
    {
      role: "user",
      parts: [
        {
          text: `Review and fix any issues in the codebase located at ${directoryPath}. You can use the following tools to interact with the file system:\n`,
        },
      ],
    },
  ];

  while (true) {
    const result = await withRetry(() =>
      ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: history,
        config: {
          systemInstruction: `
                You are a expert code reviewer and fixer.

                **Your Job : **
                1.use listFiles to explore the codebase and find files that might have issues.
                2.use readFile to read the content of those files and analyze them for potential issues.
                3.Analyze for :

                **HTML Issue: **

                - Broken links: Check for any anchor tags with href attributes that point to non-existent pages or resources.
                - Missing alt attributes: Ensure that all img tags have alt attributes for accessibility.
                - Unclosed tags: Look for any HTML tags that are not properly closed, which can lead to rendering issues.
                - Deprecated tags: Identify any usage of deprecated HTML tags and suggest modern alternatives.

                **CSS Issue: **

                - Unused CSS: Identify any CSS rules that are defined but not used in the HTML, which can bloat the stylesheet.
                - Specificity issues: Check for CSS rules that may be overridden due to specificity conflicts, leading to unexpected styling.
                - Browser compatibility: Look for CSS properties or values that may not be supported across all browsers and suggest alternatives.

                **JavaScript Issue: **

                - Syntax errors: Identify any syntax errors in the JavaScript code that could prevent it from running correctly.
                - Unused variables/functions: Look for any variables or functions that are defined but not used anywhere in the codebase, which can indicate dead code  
                - Performance issues: Analyze the code for any potential performance bottlenecks, such as inefficient loops or excessive DOM manipulation.      
                - If you find any issues, use writeFile to fix them. Provide a brief explanation of the issue and how you fixed it in the content you write to the file.
                - Always provide a summary of the changes you made and the issues you found in your response after fixing the issues.
                - If you don't find any issues, provide a summary of the files you reviewed and state that no issues were found.
                - Do not stop until you have thoroughly reviewed the codebase and fixed all potential issues.


            4. Use writeFile to fix any issues you find, and provide a brief explanation of the issue and how you fixed it in the content you write to the file.
            5.After all issues are fixed, provide a summary of the changes you made and the issues you found in your response.

            **Summary Report Format: **
            CODE REVIEW COMPLETE:

            Total Files Reviewed: X 
            Total Issues Found: Y

            Security Fix:
            - File Path: Description of the security issue and how it was fixed.

            Performance Fix:
            - File Path: Description of the performance issue and how it was fixed.

            Code Quality Fix:
            - File Path: Description of the code quality issue and how it was fixed.

            No issues found:
            - If no issues were found, provide a summary of the files you reviewed and state that no issues were found. 

            `,

          tools: [listFilesTool, readFileTool, writeFileTool],
        },
      }),
    );

    if (result.functionCalls?.length > 0) {
      for (const functionCall of result.functionCalls) {
        const { name, arguments: args } = functionCall;

        console.log(`${name}`);

        const toolResponse = await tools[name](args);

        history.push({
          role: "model",
          parts: [{ functionCall }],
        });

        history.push({
          role: "user",
          parts: [
            {
              functionCall: {
                name,
                response: { result: toolResponse },
              },
            },
          ],
        });
      }
    } else {
      console.log(`\n` + result.text);
      break;
    }
  }
}

const directoryPath = process.argv[2] || ".";

await runAgent(directoryPath);
