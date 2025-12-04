import type { Extension, AgentSkill } from '../types';

export const CURATED_EXTENSIONS: Extension[] = [
    // Core Extensions
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
    
    // Development Tools
    {
        id: 'flutter',
        name: 'Flutter Assistant',
        description: 'Specialized tools for creating, upgrading, and maintaining Flutter applications.',
        url: 'https://github.com/flutter/gemini-cli-extension'
    },
    {
        id: 'docker',
        name: 'Docker Assistant',
        description: 'Build, manage, and debug Docker containers and compose files.',
        url: 'https://github.com/docker/gemini-cli-extension'
    },
    {
        id: 'kubernetes',
        name: 'Kubernetes Helper',
        description: 'Manage K8s clusters, debug pods, and generate manifests.',
        url: 'https://github.com/kubernetes/gemini-cli-extension'
    },
    {
        id: 'terraform',
        name: 'Terraform IaC',
        description: 'Generate, validate, and plan Terraform infrastructure code.',
        url: 'https://github.com/hashicorp/gemini-cli-terraform'
    },
    
    // Project Management
    {
        id: 'linear',
        name: 'Linear',
        description: 'Manage Linear issues, projects, and cycles directly from the CLI.',
        url: 'https://github.com/linear/gemini-cli-extension'
    },
    {
        id: 'github-issues',
        name: 'GitHub Issues',
        description: 'Create, update, and manage GitHub issues and pull requests.',
        url: 'https://github.com/github/gemini-cli-issues'
    },
    {
        id: 'jira',
        name: 'Jira Integration',
        description: 'Create tickets, update sprints, and track issues in Jira.',
        url: 'https://github.com/atlassian/gemini-cli-jira'
    },
    {
        id: 'notion',
        name: 'Notion',
        description: 'Create and update Notion pages, databases, and wikis.',
        url: 'https://github.com/makenotion/gemini-cli-notion'
    },
    
    // APIs & Services
    {
        id: 'stripe',
        name: 'Stripe',
        description: 'Interact with Stripe API, manage customers, and debug payments.',
        url: 'https://github.com/stripe/gemini-cli-extension'
    },
    {
        id: 'supabase',
        name: 'Supabase',
        description: 'Manage Supabase projects, databases, auth, and edge functions.',
        url: 'https://github.com/supabase/gemini-cli-supabase'
    },
    {
        id: 'firebase',
        name: 'Firebase',
        description: 'Deploy to Firebase, manage Firestore, and configure auth.',
        url: 'https://github.com/firebase/gemini-cli-firebase'
    },
    {
        id: 'vercel',
        name: 'Vercel',
        description: 'Deploy projects, manage domains, and configure serverless functions.',
        url: 'https://github.com/vercel/gemini-cli-vercel'
    },
    {
        id: 'aws',
        name: 'AWS Toolkit',
        description: 'Interact with AWS services, deploy Lambda, manage S3, and more.',
        url: 'https://github.com/aws/gemini-cli-aws'
    },
    
    // Database Tools
    {
        id: 'postgres',
        name: 'PostgreSQL',
        description: 'Query databases, generate schemas, and optimize SQL queries.',
        url: 'https://github.com/postgres/gemini-cli-postgres'
    },
    {
        id: 'mongodb',
        name: 'MongoDB',
        description: 'Manage MongoDB collections, write aggregation pipelines.',
        url: 'https://github.com/mongodb/gemini-cli-mongo'
    },
    {
        id: 'redis',
        name: 'Redis',
        description: 'Manage Redis keys, debug caching issues, and optimize queries.',
        url: 'https://github.com/redis/gemini-cli-redis'
    },
    
    // Communication
    {
        id: 'slack',
        name: 'Slack',
        description: 'Send messages, manage channels, and integrate with workflows.',
        url: 'https://github.com/slackapi/gemini-cli-slack'
    },
    {
        id: 'discord',
        name: 'Discord',
        description: 'Manage Discord bots, send messages, and moderate servers.',
        url: 'https://github.com/discord/gemini-cli-discord'
    },
    
    // AI & ML
    {
        id: 'huggingface',
        name: 'Hugging Face',
        description: 'Search models, run inference, and manage ML datasets.',
        url: 'https://github.com/huggingface/gemini-cli-hf'
    },
    {
        id: 'openai',
        name: 'OpenAI Tools',
        description: 'Compare models, manage fine-tuning, and test prompts.',
        url: 'https://github.com/openai/gemini-cli-openai'
    },
    
    // Utilities
    {
        id: 'browser',
        name: 'Browser Automation',
        description: 'Automate browser tasks, scrape web pages, and test UIs.',
        url: 'https://github.com/AeroXi/gemini-cli-puppeteer'
    },
    {
        id: 'filesystem',
        name: 'Enhanced Filesystem',
        description: 'Advanced file operations, batch processing, and search.',
        url: 'https://github.com/AeroXi/gemini-cli-filesystem'
    }
];

export const CURATED_SKILLS: AgentSkill[] = [
    // Search & Research Skills
    {
        id: 'web-search',
        name: 'web-search',
        description: 'Search the web using DuckDuckGo or Google to retrieve up-to-date information.',
        instructions: `When the user asks for current information, news, or documentation not in your training data, use the web search tool.

## Instructions
1. Formulate a specific, targeted search query
2. Analyze the search results critically
3. Synthesize information from multiple sources
4. Always cite your sources

## Best Practices
- Use quotes for exact phrase matching
- Include site: operator for specific domains
- Verify information from multiple sources`,
        files: [
            { id: 'ws-1', name: 'search.py', content: '#!/usr/bin/env python3\n"""Web search utility using DuckDuckGo."""\nimport sys\nfrom duckduckgo_search import DDGS\n\ndef search(query: str, max_results: int = 5):\n    with DDGS() as ddgs:\n        results = list(ddgs.text(query, max_results=max_results))\n        for r in results:\n            print(f"Title: {r[\'title\']}")\n            print(f"URL: {r[\'href\']}")\n            print(f"Summary: {r[\'body\']}")\n            print("---")\n\nif __name__ == "__main__":\n    if len(sys.argv) > 1:\n        search(" ".join(sys.argv[1:]))\n    else:\n        print("Usage: search.py <query>")' }
        ]
    },
    {
        id: 'research-assistant',
        name: 'research-assistant',
        description: 'Comprehensive research assistant for deep-diving into topics with citations.',
        instructions: `You are a research assistant that helps gather, analyze, and synthesize information.

## Capabilities
- Search academic papers and documentation
- Summarize complex topics
- Create annotated bibliographies
- Generate research reports

## Output Format
Always include:
1. Executive summary
2. Key findings
3. Sources with proper citations
4. Recommendations for further reading`,
        files: []
    },

    // Code Quality Skills
    {
        id: 'git-expert',
        name: 'git-expert',
        description: 'Advanced Git operations: analyzing history, handling complex merges, and generating commit messages.',
        instructions: `You are a Git Expert. When the user asks to perform complex git tasks:

## Capabilities
- Analyze git history and blame
- Handle complex merges and rebases
- Generate conventional commit messages
- Create comprehensive changelogs
- Debug git issues

## Conventional Commits Format
\`\`\`
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
\`\`\`

Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore`,
        files: []
    },
    {
        id: 'code-review',
        name: 'code-review',
        description: 'Perform a comprehensive code review focusing on security, performance, and style.',
        instructions: `You are an expert code reviewer. Review the provided code or file comprehensively.

## Review Checklist
1. **Security**
   - SQL injection vulnerabilities
   - XSS vulnerabilities
   - Authentication/authorization issues
   - Sensitive data exposure
   - Input validation

2. **Performance**
   - N+1 queries
   - Memory leaks
   - Unnecessary computations
   - Caching opportunities

3. **Code Quality**
   - SOLID principles adherence
   - DRY violations
   - Code complexity
   - Error handling
   - Logging adequacy

4. **Style & Standards**
   - Naming conventions
   - Documentation completeness
   - Test coverage

## Output Format
Provide findings with severity (Critical/Major/Minor/Info) and specific line references.`,
        files: []
    },
    {
        id: 'test-generator',
        name: 'test-generator',
        description: 'Generate comprehensive unit, integration, and e2e tests for any codebase.',
        instructions: `You are a testing expert. Generate comprehensive tests for the provided code.

## Test Types to Consider
1. **Unit Tests** - Test individual functions/methods in isolation
2. **Integration Tests** - Test component interactions
3. **E2E Tests** - Test complete user workflows

## Best Practices
- Follow AAA pattern (Arrange, Act, Assert)
- Use descriptive test names
- Test edge cases and error conditions
- Mock external dependencies appropriately
- Aim for high code coverage without redundant tests

## Frameworks
- JavaScript/TypeScript: Jest, Vitest, Playwright
- Python: pytest, unittest
- Go: testing package, testify
- Rust: built-in test framework`,
        files: [
            { id: 'tg-1', name: 'test_template.py', content: '#!/usr/bin/env python3\n"""Test template using pytest."""\nimport pytest\n\nclass TestExample:\n    """Example test class."""\n    \n    @pytest.fixture\n    def setup_data(self):\n        """Setup test fixtures."""\n        return {"key": "value"}\n    \n    def test_example(self, setup_data):\n        """Example test case."""\n        assert setup_data["key"] == "value"\n    \n    @pytest.mark.parametrize("input,expected", [\n        (1, 2),\n        (2, 4),\n        (3, 6),\n    ])\n    def test_parametrized(self, input, expected):\n        """Parametrized test example."""\n        assert input * 2 == expected' }
        ]
    },
    {
        id: 'refactoring',
        name: 'refactoring',
        description: 'Refactor code to improve structure, readability, and maintainability.',
        instructions: `You are a refactoring expert. Analyze code and suggest improvements.

## Refactoring Techniques
1. **Extract Method** - Break down large functions
2. **Extract Class** - Separate concerns into new classes
3. **Rename** - Improve naming clarity
4. **Move Method/Field** - Better organize code location
5. **Replace Conditional with Polymorphism**
6. **Introduce Parameter Object** - Reduce parameter count
7. **Replace Magic Numbers with Constants**

## Goals
- Improve readability
- Reduce complexity
- Enhance testability
- Follow SOLID principles
- Maintain backward compatibility

Always explain the reasoning behind each refactoring suggestion.`,
        files: []
    },

    // Data & Analysis Skills
    {
        id: 'data-analysis',
        name: 'data-analysis',
        description: 'Analyze CSV/JSON data files, generate statistics, and create visualizations.',
        instructions: `You are a data analysis expert. When provided with a data file:

## Analysis Steps
1. **Data Loading & Inspection**
   - Load data using pandas
   - Display df.head(), df.info(), df.describe()
   - Check for missing values and duplicates

2. **Statistical Analysis**
   - Central tendency (mean, median, mode)
   - Dispersion (std, variance, range)
   - Correlation analysis
   - Distribution analysis

3. **Visualization**
   - Generate appropriate charts using matplotlib/seaborn
   - Save plots as images

## Output Format
Provide clear insights and recommendations based on the analysis.`,
        files: [
            { id: 'da-1', name: 'analyze.py', content: '#!/usr/bin/env python3\n"""Data analysis utility."""\nimport pandas as pd\nimport matplotlib.pyplot as plt\nimport seaborn as sns\nimport sys\n\ndef analyze(filepath: str):\n    # Load data\n    if filepath.endswith(".csv"):\n        df = pd.read_csv(filepath)\n    elif filepath.endswith(".json"):\n        df = pd.read_json(filepath)\n    else:\n        raise ValueError("Unsupported file format")\n    \n    print("=== Data Overview ===")\n    print(f"Shape: {df.shape}")\n    print(f"\\nColumns: {list(df.columns)}")\n    print(f"\\nData Types:\\n{df.dtypes}")\n    print(f"\\nMissing Values:\\n{df.isnull().sum()}")\n    print(f"\\nStatistics:\\n{df.describe()}")\n    \n    # Generate correlation heatmap for numeric columns\n    numeric_cols = df.select_dtypes(include=["number"]).columns\n    if len(numeric_cols) > 1:\n        plt.figure(figsize=(10, 8))\n        sns.heatmap(df[numeric_cols].corr(), annot=True, cmap="coolwarm")\n        plt.title("Correlation Heatmap")\n        plt.tight_layout()\n        plt.savefig("correlation_heatmap.png")\n        print("\\nCorrelation heatmap saved as correlation_heatmap.png")\n\nif __name__ == "__main__":\n    if len(sys.argv) > 1:\n        analyze(sys.argv[1])\n    else:\n        print("Usage: analyze.py <data_file>")' }
        ]
    },
    {
        id: 'sql-expert',
        name: 'sql-expert',
        description: 'Write, optimize, and debug SQL queries for any database.',
        instructions: `You are a SQL expert. Help with database queries and optimization.

## Capabilities
- Write complex SQL queries (joins, subqueries, CTEs, window functions)
- Optimize slow queries with EXPLAIN analysis
- Design efficient database schemas
- Debug query issues
- Convert between SQL dialects (PostgreSQL, MySQL, SQLite, etc.)

## Best Practices
- Use CTEs for readability
- Avoid SELECT *
- Use appropriate indexes
- Parameterize queries to prevent SQL injection
- Comment complex logic`,
        files: []
    },

    // Documentation Skills
    {
        id: 'documentation',
        name: 'documentation',
        description: 'Generate comprehensive documentation for codebases, APIs, and projects.',
        instructions: `You are a documentation expert. Create clear, comprehensive documentation.

## Documentation Types
1. **API Documentation** - OpenAPI/Swagger specs, endpoint descriptions
2. **Code Documentation** - Docstrings, comments, type hints
3. **README Files** - Project overview, setup, usage
4. **Architecture Docs** - System design, diagrams, decisions
5. **User Guides** - How-to guides, tutorials

## Format Guidelines
- Use clear headings and structure
- Include code examples
- Add diagrams where helpful (Mermaid syntax)
- Keep language simple and accessible
- Include troubleshooting sections`,
        files: []
    },
    {
        id: 'api-design',
        name: 'api-design',
        description: 'Design RESTful and GraphQL APIs following best practices.',
        instructions: `You are an API design expert. Design clean, intuitive APIs.

## REST API Guidelines
- Use proper HTTP methods (GET, POST, PUT, PATCH, DELETE)
- Use nouns for resource names
- Version your API (/v1/, /v2/)
- Use proper status codes
- Implement pagination, filtering, sorting

## GraphQL Guidelines
- Design intuitive type schemas
- Use proper naming conventions
- Implement efficient resolvers
- Handle errors gracefully

## Output Format
Provide OpenAPI spec or GraphQL schema with examples.`,
        files: []
    },

    // DevOps Skills
    {
        id: 'docker-expert',
        name: 'docker-expert',
        description: 'Create optimized Dockerfiles and docker-compose configurations.',
        instructions: `You are a Docker expert. Create efficient containerized applications.

## Dockerfile Best Practices
- Use multi-stage builds
- Minimize layers
- Use .dockerignore
- Run as non-root user
- Use specific image tags
- Order commands by change frequency

## Docker Compose
- Use version 3.x syntax
- Define proper networks
- Use environment variables
- Implement health checks
- Configure proper volumes`,
        files: [
            { id: 'de-1', name: 'Dockerfile.template', content: '# Multi-stage build example\nFROM node:20-alpine AS builder\n\nWORKDIR /app\n\n# Copy package files first for better caching\nCOPY package*.json ./\nRUN npm ci --only=production\n\n# Copy source code\nCOPY . .\nRUN npm run build\n\n# Production stage\nFROM node:20-alpine AS production\n\nWORKDIR /app\n\n# Create non-root user\nRUN addgroup -g 1001 -S nodejs && \\\n    adduser -S nodejs -u 1001\n\n# Copy built assets\nCOPY --from=builder --chown=nodejs:nodejs /app/dist ./dist\nCOPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules\n\nUSER nodejs\n\nEXPOSE 3000\n\nCMD ["node", "dist/index.js"]' }
        ]
    },
    {
        id: 'cicd-pipeline',
        name: 'cicd-pipeline',
        description: 'Design and implement CI/CD pipelines for GitHub Actions, GitLab CI, etc.',
        instructions: `You are a CI/CD expert. Design efficient deployment pipelines.

## Pipeline Stages
1. **Build** - Compile, bundle, create artifacts
2. **Test** - Unit, integration, e2e tests
3. **Security** - SAST, dependency scanning
4. **Deploy** - Staging, production deployments

## Supported Platforms
- GitHub Actions
- GitLab CI
- CircleCI
- Jenkins
- Azure DevOps

## Best Practices
- Cache dependencies
- Parallelize jobs where possible
- Use matrix builds for multi-version testing
- Implement proper secrets management
- Add deployment gates and approvals`,
        files: [
            { id: 'ci-1', name: 'github-workflow.yml', content: 'name: CI/CD Pipeline\n\non:\n  push:\n    branches: [main]\n  pull_request:\n    branches: [main]\n\njobs:\n  build-and-test:\n    runs-on: ubuntu-latest\n    \n    steps:\n      - uses: actions/checkout@v4\n      \n      - name: Setup Node.js\n        uses: actions/setup-node@v4\n        with:\n          node-version: "20"\n          cache: "npm"\n      \n      - name: Install dependencies\n        run: npm ci\n      \n      - name: Lint\n        run: npm run lint\n      \n      - name: Test\n        run: npm test -- --coverage\n      \n      - name: Build\n        run: npm run build\n      \n      - name: Upload coverage\n        uses: codecov/codecov-action@v3\n\n  deploy:\n    needs: build-and-test\n    runs-on: ubuntu-latest\n    if: github.ref == \'refs/heads/main\'\n    \n    steps:\n      - uses: actions/checkout@v4\n      - name: Deploy to production\n        run: echo "Deploy step here"' }
        ]
    },

    // Security Skills
    {
        id: 'security-audit',
        name: 'security-audit',
        description: 'Perform security audits and identify vulnerabilities in code.',
        instructions: `You are a security expert. Audit code for vulnerabilities.

## Security Checklist
1. **Authentication & Authorization**
   - Proper password hashing
   - Secure session management
   - OAuth/JWT implementation

2. **Input Validation**
   - SQL injection prevention
   - XSS prevention
   - Command injection prevention

3. **Data Protection**
   - Encryption at rest and in transit
   - Sensitive data handling
   - PII protection

4. **Dependencies**
   - Known vulnerabilities
   - Outdated packages
   - Supply chain risks

## Output Format
Provide CVSS scores where applicable and remediation steps.`,
        files: []
    },

    // Architecture Skills
    {
        id: 'system-design',
        name: 'system-design',
        description: 'Design scalable system architectures and microservices.',
        instructions: `You are a system design expert. Create scalable architectures.

## Design Considerations
1. **Requirements Gathering**
   - Functional requirements
   - Non-functional requirements (scale, latency, availability)

2. **High-Level Design**
   - Component identification
   - API design
   - Data flow

3. **Deep Dive**
   - Database schema
   - Caching strategy
   - Message queues
   - Load balancing

4. **Trade-offs**
   - CAP theorem considerations
   - Cost vs performance
   - Complexity vs maintainability

## Output Format
Include Mermaid diagrams for architecture visualization.`,
        files: []
    },

    // Frontend Skills
    {
        id: 'react-expert',
        name: 'react-expert',
        description: 'Expert React development with hooks, performance optimization, and best practices.',
        instructions: `You are a React expert. Build performant React applications.

## Best Practices
- Use functional components with hooks
- Implement proper state management
- Optimize re-renders with memo, useMemo, useCallback
- Follow accessibility guidelines (a11y)
- Write reusable components

## Performance Optimization
- Code splitting with lazy loading
- Virtual lists for large data
- Image optimization
- Bundle size monitoring

## Testing
- Unit tests with React Testing Library
- Integration tests
- E2E tests with Playwright/Cypress`,
        files: []
    },
    {
        id: 'css-expert',
        name: 'css-expert',
        description: 'Create responsive, accessible, and performant CSS/styling solutions.',
        instructions: `You are a CSS expert. Create beautiful, responsive designs.

## Capabilities
- Responsive design with CSS Grid and Flexbox
- CSS animations and transitions
- CSS variables and custom properties
- Tailwind CSS utilities
- CSS-in-JS solutions (styled-components, Emotion)

## Best Practices
- Mobile-first approach
- Use relative units (rem, em, %)
- Minimize specificity issues
- Optimize for performance
- Ensure accessibility (color contrast, focus states)`,
        files: []
    },

    // Backend Skills
    {
        id: 'nodejs-expert',
        name: 'nodejs-expert',
        description: 'Expert Node.js development with Express, NestJS, and async patterns.',
        instructions: `You are a Node.js expert. Build scalable backend applications.

## Frameworks
- Express.js
- NestJS
- Fastify
- Koa

## Best Practices
- Proper error handling with middleware
- Request validation
- Authentication/authorization
- Rate limiting
- Logging and monitoring
- Graceful shutdown

## Performance
- Clustering
- Connection pooling
- Caching strategies
- Async/await patterns`,
        files: []
    },
    {
        id: 'python-expert',
        name: 'python-expert',
        description: 'Expert Python development with FastAPI, Django, and data processing.',
        instructions: `You are a Python expert. Build robust Python applications.

## Frameworks
- FastAPI (async APIs)
- Django (full-stack)
- Flask (lightweight)

## Best Practices
- Type hints everywhere
- Virtual environments
- Proper project structure
- Async/await for I/O
- Testing with pytest

## Data Processing
- Pandas for data manipulation
- NumPy for numerical operations
- SQLAlchemy for ORM`,
        files: []
    },

    // Mobile Skills
    {
        id: 'react-native-expert',
        name: 'react-native-expert',
        description: 'Build cross-platform mobile apps with React Native.',
        instructions: `You are a React Native expert. Build cross-platform mobile apps.

## Best Practices
- Use functional components with hooks
- Implement proper navigation (React Navigation)
- Handle platform-specific code
- Optimize performance (FlatList, memoization)
- Proper state management (Redux, Zustand)

## Platform Considerations
- iOS and Android specific features
- Push notifications
- Deep linking
- App store requirements`,
        files: []
    },
    {
        id: 'flutter-expert',
        name: 'flutter-expert',
        description: 'Build beautiful cross-platform apps with Flutter and Dart.',
        instructions: `You are a Flutter expert. Build cross-platform applications.

## Best Practices
- Proper widget composition
- State management (Provider, Riverpod, Bloc)
- Navigation 2.0
- Platform channels for native code
- Performance optimization

## UI/UX
- Material Design implementation
- Custom animations
- Responsive layouts
- Accessibility`,
        files: []
    },

    // AI/ML Skills
    {
        id: 'prompt-engineering',
        name: 'prompt-engineering',
        description: 'Craft effective prompts for LLMs and AI models.',
        instructions: `You are a prompt engineering expert. Create effective AI prompts.

## Techniques
1. **Clear Instructions** - Be specific and detailed
2. **Few-Shot Learning** - Provide examples
3. **Chain of Thought** - Break down reasoning
4. **Role Playing** - Assign personas
5. **Output Formatting** - Specify desired format

## Best Practices
- Use delimiters for sections
- Provide context and constraints
- Iterate and refine
- Test edge cases`,
        files: []
    },
    {
        id: 'ml-pipeline',
        name: 'ml-pipeline',
        description: 'Design and implement machine learning pipelines.',
        instructions: `You are an ML expert. Build robust ML pipelines.

## Pipeline Stages
1. **Data Collection** - Gather and validate data
2. **Preprocessing** - Clean, transform, feature engineering
3. **Training** - Model selection, hyperparameter tuning
4. **Evaluation** - Metrics, validation strategies
5. **Deployment** - Model serving, monitoring

## Tools
- scikit-learn, TensorFlow, PyTorch
- MLflow for experiment tracking
- Kubernetes for deployment`,
        files: []
    },

    // Communication Skills
    {
        id: 'technical-writing',
        name: 'technical-writing',
        description: 'Write clear technical content, tutorials, and blog posts.',
        instructions: `You are a technical writing expert. Create clear technical content.

## Content Types
- Tutorials and how-to guides
- API documentation
- Blog posts and articles
- README files
- Release notes

## Best Practices
- Clear and concise language
- Logical structure
- Code examples
- Visual aids (diagrams, screenshots)
- Proper formatting`,
        files: []
    },
    {
        id: 'code-explainer',
        name: 'code-explainer',
        description: 'Explain complex code in simple terms for any skill level.',
        instructions: `You are a code explainer. Make complex code understandable.

## Explanation Levels
1. **Beginner** - Basic concepts, simple analogies
2. **Intermediate** - Technical details, patterns
3. **Expert** - Deep dive, edge cases, optimizations

## Format
- Line-by-line explanations when needed
- Highlight key concepts
- Use analogies for complex ideas
- Include visual diagrams when helpful`,
        files: []
    }
];

// Categories for organizing skills in the UI
export const SKILL_CATEGORIES = [
    { id: 'search', name: 'Search & Research', skills: ['web-search', 'research-assistant'] },
    { id: 'code-quality', name: 'Code Quality', skills: ['git-expert', 'code-review', 'test-generator', 'refactoring'] },
    { id: 'data', name: 'Data & Analysis', skills: ['data-analysis', 'sql-expert'] },
    { id: 'docs', name: 'Documentation', skills: ['documentation', 'api-design'] },
    { id: 'devops', name: 'DevOps', skills: ['docker-expert', 'cicd-pipeline'] },
    { id: 'security', name: 'Security', skills: ['security-audit'] },
    { id: 'architecture', name: 'Architecture', skills: ['system-design'] },
    { id: 'frontend', name: 'Frontend', skills: ['react-expert', 'css-expert'] },
    { id: 'backend', name: 'Backend', skills: ['nodejs-expert', 'python-expert'] },
    { id: 'mobile', name: 'Mobile', skills: ['react-native-expert', 'flutter-expert'] },
    { id: 'ai', name: 'AI & ML', skills: ['prompt-engineering', 'ml-pipeline'] },
    { id: 'communication', name: 'Communication', skills: ['technical-writing', 'code-explainer'] },
];

// Categories for organizing extensions in the UI
export const EXTENSION_CATEGORIES = [
    { id: 'core', name: 'Core', extensions: ['skillz', 'google-cloud', 'prompt-library'] },
    { id: 'dev', name: 'Development', extensions: ['flutter', 'docker', 'kubernetes', 'terraform'] },
    { id: 'pm', name: 'Project Management', extensions: ['linear', 'github-issues', 'jira', 'notion'] },
    { id: 'services', name: 'APIs & Services', extensions: ['stripe', 'supabase', 'firebase', 'vercel', 'aws'] },
    { id: 'database', name: 'Databases', extensions: ['postgres', 'mongodb', 'redis'] },
    { id: 'communication', name: 'Communication', extensions: ['slack', 'discord'] },
    { id: 'ai', name: 'AI & ML', extensions: ['huggingface', 'openai'] },
    { id: 'utils', name: 'Utilities', extensions: ['browser', 'filesystem'] },
];
