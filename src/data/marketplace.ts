import type { Extension, AgentSkill } from '../types';

export const CURATED_EXTENSIONS: Extension[] = [
    {
        id: 'skillz',
        name: 'Gemini CLI Skillz',
        description: 'REQUIRED for Agent Skills. Enables Anthropic-style skills support via MCP.',
        url: 'https://github.com/intellectronica/gemini-cli-skillz'
    },
    {
        id: 'google-cloud',
        name: 'Google Cloud Platform',
        description: 'Deploy apps to Cloud Run, manage BigQuery, analyze logs, and more.',
        url: 'https://github.com/google-gemini/gemini-cli-extension-cloud-run'
    },
    {
        id: 'prompt-library',
        name: 'Prompt Library',
        description: '30+ professional prompts for code review, testing, debugging, and architecture.',
        url: 'https://github.com/harish-garg/gemini-cli-prompt-library'
    },
    {
        id: 'flutter',
        name: 'Flutter Assistant',
        description: 'Specialized tools for creating, upgrading, and maintaining Flutter applications.',
        url: 'https://github.com/flutter/gemini-cli-extension'
    },
    {
        id: 'linear',
        name: 'Linear',
        description: 'Manage Linear issues, projects, and cycles directly from the CLI.',
        url: 'https://github.com/linear/gemini-cli-extension' // Hypothetical but representative
    },
    {
        id: 'stripe',
        name: 'Stripe',
        description: 'Interact with Stripe API, manage customers, and debug payments.',
        url: 'https://github.com/stripe/gemini-cli-extension' // Hypothetical
    }
];

export const CURATED_SKILLS: AgentSkill[] = [
    {
        id: 'web-search',
        name: 'web-search',
        description: 'Search the web using DuckDuckGo or Google to retrieve up-to-date information.',
        instructions: `When the user asks for current information, news, or documentation not in your training data, use the web search tool.
1. Formulate a specific search query.
2. Analyze the search results.
3. Synthesize the answer.`,
        files: [
            { id: 'ws-1', name: 'search.py', content: '# Python script to perform search using `requests` or `selenium`\n# In a real skill, this would use a library like `duckduckgo_search`\nimport sys\nprint(f"Searching for {sys.argv[1]}")' }
        ]
    },
    {
        id: 'git-expert',
        name: 'git-expert',
        description: 'Advanced Git operations: analyzing history, handling complex merges, and generating commit messages.',
        instructions: `You are a Git Expert. When the user asks to perform complex git tasks:
- Use \`git log\` to analyze history.
- Use \`git diff\` to understand changes.
- Suggest conventional commit messages.`,
        files: []
    },
    {
        id: 'code-review',
        name: 'code-review',
        description: 'Perform a comprehensive code review focusing on security, performance, and style.',
        instructions: `Review the provided code or file.
1. Check for security vulnerabilities (SQLi, XSS).
2. Identify performance bottlenecks.
3. Verify adherence to PEP8 (Python) or ESLint (JS) standards.
4. Provide a summary of recommendations.`,
        files: []
    },
    {
        id: 'data-analysis',
        name: 'data-analysis',
        description: 'Analyze CSV/JSON data files, generate statistics, and create visualizations.',
        instructions: `When provided with a data file:
1. Load the data using pandas.
2. Print \`df.head()\` and \`df.describe()\`.
3. If requested, generate a plot using matplotlib and save it as an image.`,
        files: [
            { id: 'da-1', name: 'analyze.py', content: 'import pandas as pd\nimport sys\n\ndf = pd.read_csv(sys.argv[1])\nprint(df.describe())' }
        ]
    }
];
